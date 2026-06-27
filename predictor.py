import numpy as np
import tensorflow as tf
import json

# Confidence floor below which we treat a frame as "no confident prediction"
# rather than guessing. The alphabet model also has 'space', 'del', and
# 'nothing' classes alongside A-Z, so this threshold applies uniformly to
# all 29 labels -- callers don't need to special-case any of them.
CONFIDENCE_THRESHOLD = 0.6


class SignPredictor:
    def __init__(self):
        # The alphabet MLP (sawa_asl_model.keras) has no custom layers
        # (no AttentionPooling1D like the old WLASL model), so it loads
        # directly with no safe_mode flag and no extra layer registration.
        self.model = tf.keras.models.load_model('sawa_asl_model.keras')
        with open('sawa_label_classes.json', 'r') as f:
            self.labels = json.load(f)

    def predict(self, landmarks):
        # landmarks: numpy array of shape (126,) -- a single frame's hand
        # landmark vector from hand_utils.HandTracker.get_landmarks(). The
        # model takes one static frame at a time; there's no temporal
        # buffer to manage here.
        input_vec = np.array(landmarks, dtype=np.float32).reshape(1, -1)
        probs = self.model.predict(input_vec, verbose=0)[0]
        idx = np.argmax(probs)
        conf = probs[idx]
        if conf > CONFIDENCE_THRESHOLD:
            return self.labels[idx], conf
        return None, 0.0