import cv2
import numpy as np
import time
import os
import threading
import contextlib
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from insightface.app import FaceAnalysis
import shutil

# ===============================
# CONFIGURATION
# ===============================
SIM_THRESHOLD = 0.5
CONFIRM_FRAMES = 3
MIN_FACE_SIZE = 60
ALERT_COOLDOWN = 10
CAMERA_ID = 0

# ===============================
# GLOBAL STATE
# ===============================
lock = threading.Lock()
latest_frame = None
detection_results = [] # Stores latest face data: [(box, name, color, sim), ...]
is_running = True

# ===============================
# INITIALIZE AI MODEL
# ===============================
print("Loading InsightFace model (buffalo_l)...")
app_insight = FaceAnalysis(name="buffalo_l", root='./.insightface')
app_insight.prepare(ctx_id=-1, det_size=(640, 640))
print("Model loaded.")

# ===============================
# LOAD SUSPECT DATABASE
# ===============================
suspect_db = {}
SUSPECTS_DIR = "suspects"

if not os.path.exists(SUSPECTS_DIR):
    os.makedirs(SUSPECTS_DIR)

print(f"Loading suspects from {SUSPECTS_DIR}...")
for file in os.listdir(SUSPECTS_DIR):
    if file.lower().endswith(('.jpg', '.jpeg', '.png')):
        try:
            path = os.path.join(SUSPECTS_DIR, file)
            img = cv2.imread(path)
            if img is None: continue
            
            faces = app_insight.get(img)
            if faces:
                faces = sorted(faces, key=lambda x: (x.bbox[2]-x.bbox[0]) * (x.bbox[3]-x.bbox[1]), reverse=True)
                name = os.path.splitext(file)[0]
                suspect_db[file] = faces[0].embedding
                print(f"Loaded suspect: {name}")
        except Exception as e:
            print(f"Error loading {file}: {e}")

print(f"Total suspects loaded: {len(suspect_db)}")

# ===============================
# RUNTIME VARIABLES
# ===============================
confirm_counter = {}
last_alert = {}

# ===============================
# THREAD 1: CAMERA CAPTURE
# ===============================
def camera_thread():
    global latest_frame, is_running
    cap = cv2.VideoCapture(CAMERA_ID)
    
    # Optimize Camera
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    # Optional: Force common resolution if needed
    # cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    # cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    if not cap.isOpened():
        print("Error: Could not open camera.")
        return

    print("📸 Camera Thread Started")
    
    while is_running:
        success, frame = cap.read()
        if success:
            with lock:
                latest_frame = frame.copy()
        else:
            time.sleep(0.1)
            
    cap.release()
    print("Camera Thread Stopped")

# ===============================
# THREAD 2: AI DETECTION
# ===============================
def ai_thread():
    global detection_results, is_running, latest_frame
    
    print("🧠 AI Thread Started")
    
    while is_running:
        # Get latest frame snapshot
        frame_to_process = None
        with lock:
            if latest_frame is not None:
                frame_to_process = latest_frame.copy()
        
        if frame_to_process is None:
            time.sleep(0.01)
            continue

        # Resize for speed (optional, InsightFace handles internally mostly but smaller input = faster)
        # We perform detection on full frame or scaled frame. 
        # For simplicity and accuracy mapping, we use the raw frame but could scale down.
        
        faces = app_insight.get(frame_to_process)
        
        new_results = []
        
        for face in faces:
            bbox = face.bbox.astype(int)
            x1, y1, x2, y2 = bbox
            
            # Filter small faces
            if (x2 - x1) < MIN_FACE_SIZE:
                continue
                
            emb = face.embedding
            name_match = None
            max_sim = 0
            
            # Compare with DB
            for name, db_emb in suspect_db.items():
                sim = np.dot(emb, db_emb) / (np.linalg.norm(emb) * np.linalg.norm(db_emb))
                if sim > max_sim:
                    max_sim = sim
                    name_match = os.path.splitext(name)[0]
            
            is_suspect = False
            if max_sim > SIM_THRESHOLD and name_match:
                # Update counters (Global logical state update needs care in threads but dicts are thread-safe enough for this)
                confirm_counter[name_match] = confirm_counter.get(name_match, 0) + 1
                
                if confirm_counter[name_match] >= CONFIRM_FRAMES:
                    is_suspect = True
                    # Alert logic
                    if time.time() - last_alert.get(name_match, 0) > ALERT_COOLDOWN:
                        last_alert[name_match] = time.time()
                        print(f"🚨 ALERT: Suspect {name_match} confirmed! (Sim: {max_sim:.2f})")
            else:
                 # Reset logic optional
                 pass

            color = (0, 0, 255) if is_suspect else (0, 255, 0)
            label = f"SUSPECT: {name_match} ({max_sim:.2f})" if is_suspect else "Visitor"
            
            new_results.append((bbox, label, color))
            
        with lock:
            detection_results = new_results
            if len(new_results) > 0:
                print(f"👁️ AI Update: {len(new_results)} faces tracked.")
        
        # Small sleep
        time.sleep(0.01)

# ===============================
# VIDEO STREAM GENERATOR
# ===============================
def gen_frames():
    fps_time = time.time()
    frame_count = 0
    fps = 0
    
    while True:
        frame_display = None
        current_faces = []
        
        with lock:
            if latest_frame is not None:
                frame_display = latest_frame.copy()
            current_faces = list(detection_results) # Copy reference
            
        if frame_display is None:
            time.sleep(0.01)
            continue
            
        # Draw asynchronous results on current high-speed frame
        for (bbox, label, color) in current_faces:
             x1, y1, x2, y2 = bbox
             cv2.rectangle(frame_display, (x1, y1), (x2, y2), color, 2)
             cv2.putText(frame_display, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
             
        # FPS Calculation
        frame_count += 1
        if time.time() - fps_time > 1.0:
            fps = frame_count
            frame_count = 0
            fps_time = time.time()
            
        cv2.putText(frame_display, f"FPS: {fps}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        
        ret, buffer = cv2.imencode('.jpg', frame_display)
        yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
        
        # Maintain ~30 FPS loop for streaming
        time.sleep(0.03)

# ===============================
# FASTAPI APP
# ===============================
@contextlib.asynccontextmanager
async def lifespan(app):
    # Start Threads
    t1 = threading.Thread(target=camera_thread, daemon=True)
    t2 = threading.Thread(target=ai_thread, daemon=True)
    t1.start()
    t2.start()
    
    yield
    
    # Stop Threads
    global is_running
    is_running = False
    
api = FastAPI(lifespan=lifespan)

api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@api.get('/video')
def video_feed():
    return StreamingResponse(gen_frames(), media_type='multipart/x-mixed-replace; boundary=frame')

@api.post("/upload")
async def upload_suspect(name: str, file: UploadFile = File(...)):
    try:
        # Save the file
        file_path = os.path.join(SUSPECTS_DIR, f"{name}_{file.filename}")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Process image to update DB in real-time
        img = cv2.imread(file_path)
        if img is not None:
            faces = app_insight.get(img)
            if faces:
                # Sort by face size and take the largest
                faces = sorted(faces, key=lambda x: (x.bbox[2]-x.bbox[0]) * (x.bbox[3]-x.bbox[1]), reverse=True)
                with lock:
                    suspect_db[f"{name}_{file.filename}"] = faces[0].embedding
                print(f"✅ Dynamically loaded new suspect: {name}")
                return {"status": "success", "message": f"Suspect {name} added and loaded."}
            else:
                return {"status": "error", "message": "No face detected in the uploaded image."}
        else:
            return {"status": "error", "message": "Failed to read the uploaded image."}
    except Exception as e:
        print(f"❌ Error uploading suspect: {e}")
        return {"status": "error", "message": str(e)}

@api.get("/check")
async def check_status():
    """Returns the current detection status from the AI thread."""
    with lock:
        results = list(detection_results)
    
    if not results:
        return {"alert": "WAITING", "message": "No faces detected"}
    
    # Check if any detected face is a suspect
    for bbox, label, color in results:
        if "SUSPECT" in label:
            return {"alert": "RED ALERT", "message": label}
    
    return {"alert": "SAFE", "message": "Authorised visitor detected"}

@api.post("/detect")
async def detect_face(file: UploadFile = File(...)):
    """Detects if a face in the uploaded image belongs to a suspect."""
    try:
        # Save temp file with unique name
        unique_id = int(time.time() * 1000)
        temp_path = f"temp_detect_{unique_id}_{file.filename}"
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        img = cv2.imread(temp_path)
        os.remove(temp_path) # Clean up
        
        if img is None:
            return {"status": "error", "message": "Failed to read image."}
            
        faces = app_insight.get(img)
        if not faces:
            return {"alert": "NO_FACE", "message": "No face detected in the image."}
            
        # Get largest face
        faces = sorted(faces, key=lambda x: (x.bbox[2]-x.bbox[0]) * (x.bbox[3]-x.bbox[1]), reverse=True)
        face = faces[0]
        emb = face.embedding
        
        name_match = None
        max_sim = 0
        
        # Compare with DB
        with lock:
            for name, db_emb in suspect_db.items():
                sim = np.dot(emb, db_emb) / (np.linalg.norm(emb) * np.linalg.norm(db_emb))
                if sim > max_sim:
                    max_sim = sim
                    name_match = os.path.splitext(name)[0]
        
        if max_sim > SIM_THRESHOLD and name_match:
            # Try to extract the first part of name if it's name_filename
            clean_name = name_match.split('_')[0] if '_' in name_match else name_match
            return {
                "alert": "RED ALERT", 
                "message": f"SUSPECT: {clean_name}", 
                "confidence": float(max_sim)
            }
        
        return {"alert": "SAFE", "message": "Authorised visitor detected"}
        
    except Exception as e:
        print(f"❌ Error in /detect: {e}")
        return {"status": "error", "message": str(e)}

@api.get("/suspects")
async def get_suspects():
    """Returns a list of registered suspects."""
    names = []
    for filename in os.listdir(SUSPECTS_DIR):
        if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
            names.append(os.path.splitext(filename)[0])
    return {"suspects": names}

@api.delete("/suspects/{name}")
async def delete_suspect(name: str):
    """Deletes a suspect from the database."""
    try:
        deleted = False
        with lock:
            # Remove from embedding DB
            to_remove = [k for k in suspect_db.keys() if k.startswith(name + "_") or os.path.splitext(k)[0] == name]
            for k in to_remove:
                del suspect_db[k]
                deleted = True
        
        # Remove original file
        for filename in os.listdir(SUSPECTS_DIR):
            if filename.startswith(name + "_") or os.path.splitext(filename)[0] == name:
                os.remove(os.path.join(SUSPECTS_DIR, filename))
                deleted = True
        
        if deleted:
            print(f"🗑️ Deleted suspect: {name}")
            return {"status": "success", "message": f"Suspect {name} deleted."}
        else:
            return {"status": "error", "message": "Suspect not found."}
    except Exception as e:
        print(f"❌ Error deleting suspect: {e}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    # 0.0.0.0 for external access
    uvicorn.run(api, host="0.0.0.0", port=8000)
