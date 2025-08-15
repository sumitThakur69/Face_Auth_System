import cv2
import face_recognition
import numpy as np
import requests
import base64
import json
from io import BytesIO
import time

class FaceRecognitionService:
    def __init__(self, backend_url="http://localhost:3000"):
        self.backend_url = backend_url
        self.video_capture = cv2.VideoCapture(0)
        self.known_face_encodings = []
        self.known_face_names = []
        self.known_face_ids = []
        
    def encode_image_to_base64(self, image):
        """Convert OpenCV image to base64 string"""
        _, buffer = cv2.imencode('.jpg', image)
        img_base64 = base64.b64encode(buffer).decode('utf-8')
        return img_base64
    
    def load_known_faces(self):
        """Load all registered faces from backend"""
        try:
            response = requests.get(f"{self.backend_url}/api/faces/all")
            if response.status_code == 200:
                faces_data = response.json()
                
                self.known_face_encodings = []
                self.known_face_names = []
                self.known_face_ids = []
                
                for face_data in faces_data:
                    # Convert base64 encoded face encoding back to numpy array
                    encoding_str = face_data['face_encoding']
                    face_encoding = np.frombuffer(
                        base64.b64decode(encoding_str.encode('utf-8')), 
                        dtype=np.float64
                    )
                    
                    self.known_face_encodings.append(face_encoding)
                    self.known_face_names.append(face_data['name'])
                    self.known_face_ids.append(face_data['_id'])
                
                print(f"Loaded {len(self.known_face_encodings)} known faces")
                return True
        except Exception as e:
            print(f"Error loading known faces: {e}")
            return False
    
    def register_face(self, name, email):
        """Register a new face by capturing from camera"""
        print(f"Registering face for {name}. Press SPACE to capture, ESC to cancel.")
        
        while True:
            ret, frame = self.video_capture.read()
            if not ret:
                break
                
            # Display the frame
            cv2.imshow('Face Registration - Press SPACE to capture', frame)
            
            key = cv2.waitKey(1) & 0xFF
            if key == ord(' '):  # Space key to capture
                # Find face in the current frame
                face_locations = face_recognition.face_locations(frame)
                
                if len(face_locations) == 1:  # Exactly one face found
                    face_encoding = face_recognition.face_encodings(frame, face_locations)[0]
                    
                    # Convert encoding to base64 for storage
                    encoding_base64 = base64.b64encode(face_encoding.tobytes()).decode('utf-8')
                    image_base64 = self.encode_image_to_base64(frame)
                    
                    # Send to backend
                    data = {
                        "name": name,
                        "email": email,
                        "face_encoding": encoding_base64,
                        "face_image": image_base64
                    }
                    
                    try:
                        response = requests.post(f"{self.backend_url}/api/faces/register", json=data)
                        if response.status_code == 201:
                            print("Face registered successfully!")
                            cv2.destroyWindow('Face Registration - Press SPACE to capture')
                            return True
                        else:
                            print(f"Registration failed: {response.json()}")
                    except Exception as e:
                        print(f"Error registering face: {e}")
                        
                elif len(face_locations) == 0:
                    print("No face detected. Please position your face in the frame.")
                else:
                    print("Multiple faces detected. Please ensure only one face is in the frame.")
                    
            elif key == 27:  # ESC key to cancel
                cv2.destroyWindow('Face Registration - Press SPACE to capture')
                return False
        
        return False
    
    def authenticate_face(self):
        """Real-time face authentication"""
        print("Starting face authentication. Press 'q' to quit.")
        
        # Load known faces from backend
        if not self.load_known_faces():
            print("Failed to load known faces. Please check backend connection.")
            return
        
        face_locations = []
        face_encodings = []
        face_names = []
        process_this_frame = True
        
        while True:
            ret, frame = self.video_capture.read()
            if not ret:
                break
            
            # Resize frame for faster processing
            small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
            rgb_small_frame = small_frame[:, :, ::-1]
            
            # Process every other frame for performance
            if process_this_frame:
                face_locations = face_recognition.face_locations(rgb_small_frame)
                face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)
                
                face_names = []
                for face_encoding in face_encodings:
                    matches = face_recognition.compare_faces(self.known_face_encodings, face_encoding)
                    name = "Unknown"
                    confidence = 0
                    
                    # Use the known face with the smallest distance
                    face_distances = face_recognition.face_distance(self.known_face_encodings, face_encoding)
                    
                    if len(face_distances) > 0:
                        best_match_index = np.argmin(face_distances)
                        if matches[best_match_index]:
                            name = self.known_face_names[best_match_index]
                            confidence = 1 - face_distances[best_match_index]
                            
                            # Log authentication attempt
                            self.log_authentication(self.known_face_ids[best_match_index], True, confidence)
                        else:
                            # Log failed authentication
                            self.log_authentication(None, False, 0)
                    
                    face_names.append(f"{name} ({confidence:.2f})")
            
            process_this_frame = not process_this_frame
            
            # Display results
            for (top, right, bottom, left), name in zip(face_locations, face_names):
                # Scale back up face locations
                top *= 4
                right *= 4
                bottom *= 4
                left *= 4
                
                # Draw rectangle around face
                color = (0, 255, 0) if "Unknown" not in name else (0, 0, 255)
                cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
                
                # Draw label
                cv2.rectangle(frame, (left, bottom - 35), (right, bottom), color, cv2.FILLED)
                cv2.putText(frame, name, (left + 6, bottom - 6), cv2.FONT_HERSHEY_DUPLEX, 0.6, (255, 255, 255), 1)
            
            cv2.imshow('Face Authentication', frame)
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
    
    def log_authentication(self, user_id, success, confidence):
        """Log authentication attempt to backend"""
        try:
            data = {
                "user_id": user_id,
                "success": success,
                "confidence": confidence,
                "timestamp": time.time()
            }
            requests.post(f"{self.backend_url}/api/auth/log", json=data)
        except Exception as e:
            print(f"Error logging authentication: {e}")
    
    def __del__(self):
        """Cleanup"""
        if hasattr(self, 'video_capture'):
            self.video_capture.release()
        cv2.destroyAllWindows()

def main():
    service = FaceRecognitionService()
    
    while True:
        print("\n=== Face Recognition Authentication System ===")
        print("1. Register new face")
        print("2. Start authentication")
        print("3. Exit")
        
        choice = input("Enter your choice (1-3): ").strip()
        
        if choice == '1':
            name = input("Enter name: ").strip()
            email = input("Enter email: ").strip()
            
            if name and email:
                service.register_face(name, email)
            else:
                print("Name and email are required!")
                
        elif choice == '2':
            service.authenticate_face()
            
        elif choice == '3':
            print("Goodbye!")
            break
        else:
            print("Invalid choice!")

if __name__ == "__main__":
    main()