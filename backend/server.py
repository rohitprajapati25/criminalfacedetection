from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import face_recognition
import numpy as np
import cv2
import os
from PIL import Image

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load suspect
SUSPECT_PATH = "suspect.jpg"
suspect_encoding = None

if os.path.exists(SUSPECT_PATH):
    try:
        # Load image using PIL (recommended for face_recognition)
        pil_image = Image.open(SUSPECT_PATH)
        # Convert to RGB if needed
        if pil_image.mode != 'RGB':
            pil_image = pil_image.convert('RGB')
        # Convert to numpy array
        suspect_image = np.array(pil_image)
        
        encodings = face_recognition.face_encodings(suspect_image)
        if encodings:
            suspect_encoding = encodings[0]
            print("Suspect loaded successfully.")
        else:
            print("No face found in suspect image.")
    except Exception as e:
        print(f"Error loading suspect: {e}")
else:
    print(f"Suspect image NOT found at {SUSPECT_PATH}")

@app.post("/check")
async def check_face(file: UploadFile = File(...)):
    if suspect_encoding is None:
        return {"alert": "ERROR", "message": "Suspect not loaded"}

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        return {"alert": "ERROR", "message": "Invalid image"}

    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    faces = face_recognition.face_encodings(rgb)

    for face in faces:
        match = face_recognition.compare_faces([suspect_encoding], face, tolerance=0.6)
        if True in match:
            return {"alert": "RED ALERT"}

    return {"alert": "SAFE"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
