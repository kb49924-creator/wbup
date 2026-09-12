import json
import logging
from pathlib import Path
import os
import io
import time

logger = logging.getLogger("wb.local_ai")

DATASET_FILE = Path("data/dataset.json")
MODEL_FILE = Path("data/local_ai_model.pkl")

class LocalAIRanker:
    def __init__(self):
        self.is_trained = MODEL_FILE.exists()
        self.accuracy = 0.0
        self.dataset = self._load_dataset()
        self._model = None
        self._feature_extractor = None
        
    def _load_dataset(self):
        if DATASET_FILE.exists():
            try:
                return json.loads(DATASET_FILE.read_text())
            except Exception:
                return []
        return []
        
    def _save_dataset(self):
        DATASET_FILE.parent.mkdir(parents=True, exist_ok=True)
        DATASET_FILE.write_text(json.dumps(self.dataset, indent=2))
        
    def add_label(self, article: int, url: str, path: str, label: int):
        # Update if exists
        for item in self.dataset:
            if item["path"] == path:
                item["label"] = label
                self._save_dataset()
                return len(self.dataset)
        
        self.dataset.append({
            "article": article,
            "url": url,
            "path": path,
            "label": label
        })
        self._save_dataset()
        return len(self.dataset)

    def remove_label(self, path: str):
        self.dataset = [item for item in self.dataset if item["path"] != path]
        self._save_dataset()
        return len(self.dataset)
        
    def get_dataset(self):
        return self.dataset

    def _init_feature_extractor(self):
        if self._feature_extractor is not None:
            return
            
        import torch
        import torchvision.models as models
        import torchvision.transforms as transforms
        
        logger.info("Initializing MobileNetV2 Feature Extractor...")
        # Use MobileNetV2 (lightweight, ~14MB)
        model = models.mobilenet_v2(pretrained=True)
        # Remove classification head, just keep features
        self._feature_extractor = model.features
        self._feature_extractor.eval()
        
        # Use MPS if available on M1
        self.device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
        self._feature_extractor = self._feature_extractor.to(self.device)
        
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                                 std=[0.229, 0.224, 0.225])
        ])

    def _extract_features(self, img_input):
        import torch
        from PIL import Image
        import cv2
        import numpy as np
        
        # 1. In-memory loading (no duplicate disk I/O)
        try:
            if isinstance(img_input, (str, Path)):
                img = Image.open(str(img_input)).convert('RGB')
            elif isinstance(img_input, Image.Image):
                img = img_input.convert('RGB')
            else:
                img = Image.fromarray(img_input).convert('RGB')
        except Exception as e:
            logger.error(f"Error loading image for feature extraction: {e}")
            return np.zeros(1282)

        # 2. Deep features (MobileNetV2)
        try:
            tensor = self.transform(img).unsqueeze(0).to(self.device)
            with torch.no_grad():
                features = self._feature_extractor(tensor)
                features = features.mean([2, 3]).squeeze(0) # Global Average Pooling -> 1280 dim
            deep_features = features.cpu().numpy()
        except Exception as e:
            logger.error(f"Error extracting deep features: {e}")
            deep_features = np.zeros(1280)
            
        # 3. Hand-crafted features (OpenCV directly from in-memory numpy array)
        try:
            cv_img = np.array(img.convert('L'))
            edges = cv2.Canny(cv_img, 100, 200)
            edge_density = float(np.sum(edges > 0) / (cv_img.shape[0] * cv_img.shape[1]))
            std_dev = float(np.std(cv_img))
            cv_features = np.array([edge_density, std_dev])
        except Exception:
            cv_features = np.array([0.0, 0.0])
            
        return np.concatenate([deep_features, cv_features])

    def train(self):
        if len(self.dataset) < 2:
            return {"status": "error", "message": "Нужно хотя бы 2 размеченных фото (Good и Bad)"}
            
        import numpy as np
        from sklearn.linear_model import LogisticRegression
        from sklearn.model_selection import cross_val_score
        import pickle
        
        self._init_feature_extractor()
        
        X = []
        y = []
        
        logger.info(f"Extracting features for {len(self.dataset)} images...")
        start_time = time.time()
        for item in self.dataset:
            path = item["path"]
            if os.path.exists(path):
                feats = self._extract_features(path)
                X.append(feats)
                y.append(item["label"])
                
        if len(set(y)) < 2:
            return {"status": "error", "message": "Нужны примеры ОБОИХ классов (и Good, и Bad)"}
            
        X = np.array(X)
        y = np.array(y)
        
        # Train Logistic Regression
        clf = LogisticRegression(max_iter=1000, class_weight='balanced')
        
        # Calculate CV accuracy if we have enough samples
        if len(y) >= 5:
            scores = cross_val_score(clf, X, y, cv=min(5, len(y)//2))
            self.accuracy = round(scores.mean() * 100, 1)
        else:
            self.accuracy = 100.0 # Not enough for CV
            
        clf.fit(X, y)
        
        # Save model
        with open(MODEL_FILE, "wb") as f:
            pickle.dump(clf, f)
            
        self.is_trained = True
        self._model = clf
        
        elapsed = time.time() - start_time
        logger.info(f"Trained in {elapsed:.2f}s. Accuracy: {self.accuracy}%")
        
        return {"status": "trained", "accuracy": self.accuracy, "samples": len(X)}
        
    def predict_score(self, img_input):
        """Returns probability (0.0 to 1.0) of being a 'Good' photo."""
        if not self.is_trained or not os.path.exists(MODEL_FILE):
            return 0.5
            
        if self._model is None:
            import pickle
            with open(MODEL_FILE, "rb") as f:
                self._model = pickle.load(f)
                
        self._init_feature_extractor()
        
        feats = self._extract_features(img_input)
        # Return probability of class 1
        prob = float(self._model.predict_proba([feats])[0][1])
        return prob

    def predict_scores_batch(self, img_inputs: list) -> list[float]:
        """High-performance batch scoring for multiple images in a single forward pass."""
        if not img_inputs:
            return []
        if not self.is_trained or not os.path.exists(MODEL_FILE):
            return [0.5] * len(img_inputs)
            
        if self._model is None:
            import pickle
            with open(MODEL_FILE, "rb") as f:
                self._model = pickle.load(f)
                
        self._init_feature_extractor()
        
        import torch
        from PIL import Image
        import cv2
        import numpy as np

        tensors = []
        cv_feats_list = []
        valid_indices = []

        for idx, img_input in enumerate(img_inputs):
            try:
                if isinstance(img_input, (str, Path)):
                    img = Image.open(str(img_input)).convert('RGB')
                elif isinstance(img_input, Image.Image):
                    img = img_input.convert('RGB')
                else:
                    img = Image.fromarray(img_input).convert('RGB')
                
                tensors.append(self.transform(img))
                cv_img = np.array(img.convert('L'))
                edges = cv2.Canny(cv_img, 100, 200)
                edge_density = float(np.sum(edges > 0) / (cv_img.shape[0] * cv_img.shape[1]))
                std_dev = float(np.std(cv_img))
                cv_feats_list.append(np.array([edge_density, std_dev]))
                valid_indices.append(idx)
            except Exception as e:
                logger.error(f"Error preparing image {idx} for batch: {e}")

        if not tensors:
            return [0.5] * len(img_inputs)

        # Batch forward pass through MobileNetV2
        try:
            batch_tensor = torch.stack(tensors).to(self.device)
            with torch.no_grad():
                features = self._feature_extractor(batch_tensor)
                features = features.mean([2, 3])  # (B, 1280)
            deep_features = features.cpu().numpy()
        except Exception as e:
            logger.error(f"Error in batch forward pass: {e}")
            return [0.5] * len(img_inputs)

        all_feats = [
            np.concatenate([deep_features[i], cv_feats_list[i]])
            for i in range(len(valid_indices))
        ]
        
        probs = self._model.predict_proba(all_feats)[:, 1]

        scores = [0.5] * len(img_inputs)
        for i, original_idx in enumerate(valid_indices):
            scores[original_idx] = float(probs[i])

        return scores
        
    def get_status(self):
        return {
            "is_trained": self.is_trained,
            "accuracy": self.accuracy,
            "labeled_count": len(self.dataset)
        }

local_ai = LocalAIRanker()
