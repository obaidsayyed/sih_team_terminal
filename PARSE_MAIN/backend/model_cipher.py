import pandas as pd
import xgboost as xgb
import optuna
import json
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
import numpy as np

def load_data():
    df = pd.read_csv(r'C:\Users\Admin\Desktop\sih26160\PARSE_MAIN\backend\combined_dataset.csv')
    print(f"Loaded {len(df)} total records from combined_dataset.csv.")
    return df

def preprocess_data(df):
    df['avg_packet_size'] = df['pcap_size_bytes'] / df['packet_count'].replace(0, 1)
    df['esp_ratio'] = df['esp_packet_count'] / df['packet_count'].replace(0, 1)
    df['ike_ratio'] = df['ike_packet_count'] / df['packet_count'].replace(0, 1)
    
    feature_cols = ['packet_count', 'ike_packet_count', 'esp_packet_count', 'plain_icmp_count', 'pcap_size_bytes', 'avg_packet_size', 'esp_ratio', 'ike_ratio']
    X = df[feature_cols]
    
    y_raw = df['cipher']
    
    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(y_raw)
    
    return X, y, label_encoder

def objective(trial, X, y):
    param = {
        'tree_method': 'hist',
        'max_depth': trial.suggest_int('max_depth', 3, 12),
        'learning_rate': trial.suggest_float('learning_rate', 0.0001, 0.1, log=True),
        'n_estimators': trial.suggest_int('n_estimators', 50, 400),
        'subsample': trial.suggest_float('subsample', 0.5, 1.0),
        'colsample_bytree': trial.suggest_float('colsample_bytree', 0.5, 1.0),
        'random_state': 42
    }
    
    num_classes = len(set(y))
    if num_classes == 2:
        pos_count = sum(y == 1)
        neg_count = sum(y == 0)
        param['scale_pos_weight'] = neg_count / pos_count if pos_count > 0 else 1.0
        
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scores = []
    
    for train_idx, val_idx in cv.split(X, y):
        X_train_cv, X_val_cv = X.iloc[train_idx], X.iloc[val_idx]
        y_train_cv, y_val_cv = y[train_idx], y[val_idx]
        
        model = xgb.XGBClassifier(**param)
        model.fit(X_train_cv, y_train_cv)
        
        preds = model.predict(X_val_cv)
        scores.append(f1_score(y_val_cv, preds, average='macro'))
        
    return np.mean(scores)

def print_metrics(y_true, y_pred, y_prob, dataset_name):
    print(f"\n--- {dataset_name} Metrics ---")
    print(f"Accuracy : {accuracy_score(y_true, y_pred):.4f}")
    print(f"Precision: {precision_score(y_true, y_pred, average='weighted', zero_division=0):.4f}")
    print(f"Recall   : {recall_score(y_true, y_pred, average='weighted', zero_division=0):.4f}")
    print(f"F1-Score : {f1_score(y_true, y_pred, average='weighted', zero_division=0):.4f}")
    
    if y_prob.shape[1] == 2:
        roc_auc = roc_auc_score(y_true, y_prob[:, 1])
    else:
        roc_auc = roc_auc_score(y_true, y_prob, multi_class='ovr', average='weighted')
    print(f"ROC-AUC  : {roc_auc:.4f}")

if __name__ == "__main__":
    df = load_data()
    X, y, le = preprocess_data(df)
    
    num_classes = len(le.classes_)
    print(f"Target classes detected ({num_classes}): {le.classes_}")
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42, stratify=y)
    
    print("\nStarting Optuna Hyperparameter Tuning...")
    
    study = optuna.create_study(direction='maximize')
    study.optimize(lambda trial: objective(trial, X_train, y_train), n_trials=82)
    
    best_params = study.best_params
    print("\n=========================================")
    print("Optuna Best Hyperparameters Found:")
    for key, value in best_params.items():
        print(f"  {key}: {value}")
    print("=========================================\n")
    
    print("Training final model with best hyperparameters...")
    final_params = best_params.copy()
    if num_classes == 2:
        pos_count = sum(y_train == 1)
        neg_count = sum(y_train == 0)
        final_params['scale_pos_weight'] = neg_count / pos_count if pos_count > 0 else 1.0

    final_model = xgb.XGBClassifier(
        tree_method='hist',
        random_state=42,
        **final_params
    )
    final_model.fit(X_train, y_train)
    
    y_train_pred = final_model.predict(X_train)
    y_train_prob = final_model.predict_proba(X_train)
    print_metrics(y_train, y_train_pred, y_train_prob, "TRAINING DATA")
    
    y_test_pred = final_model.predict(X_test)
    y_test_prob = final_model.predict_proba(X_test)
    print_metrics(y_test, y_test_pred, y_test_prob, "TESTING DATA")
    
    print("\nSaving final model to 'xgboost_model_cipher.json'...")
    final_model.save_model(r'C:\Users\Admin\Desktop\sih26160\PARSE_MAIN\backend\xgboost_model_cipher.json')
    
    le_classes = le.classes_.tolist()
    with open(r'C:\Users\Admin\Desktop\sih26160\PARSE_MAIN\backend\label_encoder_cipher.json', 'w') as f:
        json.dump(le_classes, f)
    print("Saved label encoder classes to 'label_encoder_cipher.json'.")
