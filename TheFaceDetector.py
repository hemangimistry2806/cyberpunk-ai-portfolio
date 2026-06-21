import cv2
import os
import time
import threading

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

try:
    import winsound
except ImportError:
    winsound = None

try:
    import win32com.client
except ImportError:
    win32com = None

try:
    import mediapipe as mp
except Exception:
    mp = None

# Configuration
CAMERA_WIDTH = 560
CAMERA_HEIGHT = 420
DISPLAY_WIDTH = 960
DISPLAY_HEIGHT = 720
ALARM_INTERVAL = 2.5
MIRROR_CAMERA = True
MIN_FACE_AREA_RATIO = 0.035
MAX_FACE_AREA_RATIO = 0.55
MIN_FACE_CONFIDENCE = 1.5
STRONG_FACE_CONFIDENCE = 4.0

voice_alarm_running = False

hands_available = mp is not None
mp_hands = mp.solutions.hands if mp else None
mp_drawing = mp.solutions.drawing_utils if mp else None
hand_detector = None


def simple_alarm():
    if winsound is None:
        return
    winsound.Beep(1200, 250)


def voice_alarm(message):
    """Play a strong no-face alert without freezing the camera window."""
    global voice_alarm_running

    if voice_alarm_running:
        return

    voice_alarm_running = True

    def _play():
        global voice_alarm_running
        try:
            if winsound is not None:
                for frequency in (1300, 1700, 1300):
                    winsound.Beep(frequency, 220)

            if win32com is not None:
                speaker = win32com.client.Dispatch("SAPI.SpVoice")
                speaker.Volume = 100
                speaker.Rate = 1
                speaker.Speak(message)
            elif winsound is not None:
                for _ in range(4):
                    winsound.Beep(1500, 300)
        finally:
            voice_alarm_running = False

    threading.Thread(target=_play, daemon=True).start()


def draw_error_banner(frame, message):
    height, width = frame.shape[:2]
    cv2.rectangle(frame, (0, height - 78), (width, height), (0, 0, 255), -1)
    cv2.putText(
        frame,
        message,
        (12, height - 30),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (255, 255, 255),
        2,
    )


def box_iou(first, second):
    x1, y1, w1, h1 = first
    x2, y2, w2, h2 = second

    left = max(x1, x2)
    top = max(y1, y2)
    right = min(x1 + w1, x2 + w2)
    bottom = min(y1 + h1, y2 + h2)

    if right <= left or bottom <= top:
        return 0.0

    intersection = (right - left) * (bottom - top)
    area1 = w1 * h1
    area2 = w2 * h2
    return intersection / float(area1 + area2 - intersection)


def detect_face_candidates(face_cascade, gray):
    try:
        faces, _, weights = face_cascade.detectMultiScale3(
            gray,
            scaleFactor=1.08,
            minNeighbors=8,
            minSize=(100, 100),
            outputRejectLevels=True,
        )
        return list(faces), [float(weight) for weight in weights]
    except Exception:
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.08,
            minNeighbors=8,
            minSize=(100, 100),
        )
        return list(faces), [STRONG_FACE_CONFIDENCE for _ in faces]


def has_face_like_eyes(eye_cascade, gray, face_box):
    x, y, w, h = face_box
    upper_face = gray[y : y + int(h * 0.65), x : x + w]
    eyes = eye_cascade.detectMultiScale(
        upper_face,
        scaleFactor=1.08,
        minNeighbors=5,
        minSize=(max(18, w // 8), max(18, h // 8)),
    )
    return len(eyes) > 0


def filter_face_detections(face_cascade, eye_cascade, gray, frame_shape):
    raw_faces, weights = detect_face_candidates(face_cascade, gray)
    frame_h, frame_w = frame_shape[:2]
    frame_area = frame_w * frame_h
    candidates = []

    for face_box, weight in zip(raw_faces, weights):
        x, y, w, h = [int(value) for value in face_box]
        area_ratio = (w * h) / float(frame_area)
        aspect_ratio = w / float(h)

        if weight < MIN_FACE_CONFIDENCE:
            continue
        if area_ratio < MIN_FACE_AREA_RATIO or area_ratio > MAX_FACE_AREA_RATIO:
            continue
        if aspect_ratio < 0.72 or aspect_ratio > 1.35:
            continue

        eye_confirmed = has_face_like_eyes(eye_cascade, gray, (x, y, w, h))
        if not eye_confirmed and weight < STRONG_FACE_CONFIDENCE:
            continue

        candidates.append(((x, y, w, h), weight, eye_confirmed))

    candidates.sort(key=lambda item: (item[2], item[1], item[0][2] * item[0][3]), reverse=True)
    filtered_faces = []

    for face_box, _, _ in candidates:
        if all(box_iou(face_box, kept_box) < 0.35 for kept_box in filtered_faces):
            filtered_faces.append(face_box)

    return filtered_faces


def initialize_hand_detector():
    global hand_detector
    if not hands_available:
        return
    hand_detector = mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=2,
        model_complexity=1,
        min_detection_confidence=0.35,
        min_tracking_confidence=0.35,
    )


def close_hand_detector():
    global hand_detector
    if hand_detector is not None:
        hand_detector.close()
        hand_detector = None


def classify_hand_gesture(hand_landmarks):
    lm = hand_landmarks.landmark

    def distance(first, second):
        dx = lm[first].x - lm[second].x
        dy = lm[first].y - lm[second].y
        return (dx * dx + dy * dy) ** 0.5

    # Thumb is considered open when its tip moves away from the index finger base.
    thumb_extended = distance(4, 5) > distance(3, 5) * 1.15
    thumb_vertical = abs(lm[4].y - lm[2].y) > abs(lm[4].x - lm[2].x) * 1.25

    finger_extended = [
        lm[8].y < lm[6].y and lm[7].y < lm[6].y,
        lm[12].y < lm[10].y and lm[11].y < lm[10].y,
        lm[16].y < lm[14].y and lm[15].y < lm[14].y,
        lm[20].y < lm[18].y and lm[19].y < lm[18].y,
    ]

    extended_count = sum(finger_extended) + int(thumb_extended)
    if extended_count == 5:
        return "open hand"
    if extended_count <= 1 and not any(finger_extended):
        return "fist"
    if finger_extended[0] and not any(finger_extended[1:]) and not thumb_extended:
        return "point"
    if finger_extended[0] and finger_extended[1] and not any(finger_extended[2:]) and not thumb_extended:
        return "peace"
    if finger_extended[1] and not finger_extended[0] and not finger_extended[2] and not finger_extended[3]:
        return "middle finger"
    if thumb_extended and thumb_vertical and not any(finger_extended):
        if lm[4].y < lm[2].y:
            return "thumbs up"
        return "thumbs down"
    if thumb_extended and not any(finger_extended):
        return "thumbs up"
    return "hand"


def main():
    global hand_detector
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_eye.xml")
    if face_cascade.empty():
        print("ERROR: Face cascade file could not be loaded.")
        return
    if eye_cascade.empty():
        print("ERROR: Eye cascade file could not be loaded.")
        return

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("ERROR: Could not open camera. If running in a headless environment, camera isn't available.")
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, CAMERA_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, CAMERA_HEIGHT)

    cv2.namedWindow("Exam Face Detector", cv2.WINDOW_NORMAL)
    cv2.resizeWindow("Exam Face Detector", DISPLAY_WIDTH, DISPLAY_HEIGHT)

    initialize_hand_detector()
    last_alarm_time = 0

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Camera frame not available")
                break
            if MIRROR_CAMERA:
                frame = cv2.flip(frame, 1)

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            gray = cv2.equalizeHist(gray)
            faces = filter_face_detections(face_cascade, eye_cascade, gray, frame.shape)

            face_count = len(faces)
            alarm_needed = False
            no_face_alarm = False
            alarm_message = None

            if face_count == 0:
                status_text = "ERROR: No face detected"
                status_color = (0, 0, 255)
                alarm_needed = True
                no_face_alarm = True
                alarm_message = "Warning. Face not detected. Please stay in front of the camera."
            elif face_count > 1:
                status_text = f"ERROR: Multiple faces detected ({face_count})"
                status_color = (0, 0, 255)
                alarm_needed = True
                alarm_message = "Warning. Multiple faces detected. Only one person is allowed."
            else:
                status_text = "One face detected"
                status_color = (0, 255, 0)

            for (x, y, w, h) in faces:
                box_color = (0, 255, 0) if face_count == 1 else (0, 0, 255)
                cv2.rectangle(frame, (x, y), (x + w, y + h), box_color, 2)

            hand_gesture_summary = "hands unavailable"
            gesture_violation = False
            if hands_available and hand_detector is not None:
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                rgb_frame.flags.writeable = False
                results = hand_detector.process(rgb_frame)
                rgb_frame.flags.writeable = True
                gestures = []
                if getattr(results, 'multi_hand_landmarks', None):
                    for hand_landmarks in results.multi_hand_landmarks:
                        gesture = classify_hand_gesture(hand_landmarks)
                        gestures.append(gesture)
                        try:
                            mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
                        except Exception:
                            pass
                hand_gesture_summary = ", ".join(gestures) if gestures else "no hands"
                gesture_violation = "middle finger" in gestures

            if gesture_violation:
                status_text = "ERROR: Conduct violation"
                status_color = (0, 0, 255)
                alarm_needed = True
                no_face_alarm = False
                alarm_message = "Warning. Conduct violation detected. Inappropriate gesture."

            cv2.putText(frame, status_text, (10, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.8, status_color, 2)
            cv2.putText(frame, f"Hand gestures: {hand_gesture_summary}", (10, 64), cv2.FONT_HERSHEY_SIMPLEX, 0.7,
                        (0, 255, 255) if hand_gesture_summary != "no hands" else (255, 255, 0), 2)

            if gesture_violation:
                draw_error_banner(frame, "ERROR: Conduct violation")
            elif face_count == 0:
                draw_error_banner(frame, "ERROR: Face not detected")
            elif face_count > 1:
                draw_error_banner(frame, "ERROR: Only one face allowed")

            if alarm_needed:
                now = time.time()
                if now - last_alarm_time >= ALARM_INTERVAL:
                    if alarm_message is not None:
                        voice_alarm(alarm_message)
                    else:
                        simple_alarm()
                    last_alarm_time = now

            cv2.imshow("Exam Face Detector", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

    except KeyboardInterrupt:
        print("Interrupted by user")
    finally:
        close_hand_detector()
        cap.release()
        cv2.destroyAllWindows()


if __name__ == '__main__':
    main()
