import pandas as pd
import glob
import xgboost as xgb
import optuna
import json
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

def load_data():
    # Load the completely mixed (noisy + clean) dataset
    df = pd.read_csv(r'C:\Users\Admin\Desktop\sih26160\backend\combined_dataset.csv')
    print(f"Loaded {len(df)} total records from combined_dataset.csv.")
    return df

def preprocess_data(df):
    # Select numeric features for training
    # (Excluding metadata like filename, config_id, status)
    feature_cols = ['packet_count', 'ike_packet_count', 'esp_packet_count', 'plain_icmp_count', 'pcap_size_bytes']
    X = df[feature_cols]
    
    # We will predict the traffic_type (multi-class: web, video, icmp, email, voip)
    # If you want to predict the combined config_id + traffic_type, change the line below to:
    # y_raw = df['config_id'] + '_' + df['traffic_type']
    y_raw = df['traffic_type']
    
    # XGBoost requires target labels to be numeric (0, 1, 2, ...)
    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(y_raw)
    
    return X, y, label_encoder

def objective(trial, X_train, y_train, X_val, y_val):
    # Define hyperparameters for Optuna to tune
    param = {
        'objective': 'multi:softprob',
        'eval_metric': 'mlogloss',
        'tree_method': 'hist',  # faster training
        'max_depth': trial.suggest_int('max_depth', 3, 9),
        'learning_rate': trial.suggest_float('learning_rate', 1e-3, 0.3, log=True),
        'n_estimators': trial.suggest_int('n_estimators', 50, 300),
        'subsample': trial.suggest_float('subsample', 0.5, 1.0),
        'colsample_bytree': trial.suggest_float('colsample_bytree', 0.5, 1.0),
        'random_state': 42
    }
    
    # Initialize and train the model
    model = xgb.XGBClassifier(**param)
    model.fit(X_train, y_train)
    
    # Predict and evaluate on the validation set
    preds = model.predict(X_val)
    accuracy = accuracy_score(y_val, preds)
    return accuracy

def print_metrics(y_true, y_pred, y_prob, dataset_name):
    print(f"\n--- {dataset_name} Metrics ---")
    print(f"Accuracy : {accuracy_score(y_true, y_pred):.4f}")
    
    # For multiclass, we use weighted averages
    print(f"Precision: {precision_score(y_true, y_pred, average='weighted', zero_division=0):.4f}")
    print(f"Recall   : {recall_score(y_true, y_pred, average='weighted', zero_division=0):.4f}")
    print(f"F1-Score : {f1_score(y_true, y_pred, average='weighted', zero_division=0):.4f}")
    
    # ROC-AUC requires probabilities for each class
    roc_auc = roc_auc_score(y_true, y_prob, multi_class='ovr', average='weighted')
    print(f"ROC-AUC  : {roc_auc:.4f}")

if __name__ == "__main__":
    # 1. Load and preprocess
    df = load_data()
    X, y, le = preprocess_data(df)
    
    num_classes = len(le.classes_)
    print(f"Target classes detected ({num_classes}): {le.classes_}")
    
    # 2. Train/Test Split (70-30 split as requested)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42, stratify=y)
    
    # 3. Optuna Hyperparameter Tuning
    print("\nStarting Optuna Hyperparameter Tuning...")
    # We will split a small validation set from the train set just for Optuna evaluation
    X_opt_train, X_opt_val, y_opt_train, y_opt_val = train_test_split(X_train, y_train, test_size=0.2, random_state=42, stratify=y_train)
    
    study = optuna.create_study(direction='maximize')
    # Run for exactly 82 epochs (trials) as requested
    study.optimize(lambda trial: objective(trial, X_opt_train, y_opt_train, X_opt_val, y_opt_val), n_trials=82)
    
    # 4. Print Best Hyperparameters
    best_params = study.best_params
    print("\n=========================================")
    print("Optuna Best Hyperparameters Found:")
    for key, value in best_params.items():
        print(f"  {key}: {value}")
    print("=========================================\n")
    
    # 5. Train Final Model on the entire 70% Training Set using best params
    print("Training final model with best hyperparameters...")
    final_model = xgb.XGBClassifier(
        objective='multi:softprob',
        eval_metric='mlogloss',
        tree_method='hist',
        random_state=42,
        **best_params
    )
    final_model.fit(X_train, y_train)
    
    # 6. Evaluate on Training Data
    y_train_pred = final_model.predict(X_train)
    y_train_prob = final_model.predict_proba(X_train)
    print_metrics(y_train, y_train_pred, y_train_prob, "TRAINING DATA")
    
    # 7. Evaluate on Testing Data (The remaining 30%)
    y_test_pred = final_model.predict(X_test)
    y_test_prob = final_model.predict_proba(X_test)
    print_metrics(y_test, y_test_pred, y_test_prob, "TESTING DATA")
    
    # 8. Save Model and Encoders for Backend use
    print("\nSaving final model to 'xgboost_model.json'...")
    final_model.save_model('xgboost_model.json')
    
    # Save the label encoder classes to a JSON file
    le_classes = le.classes_.tolist()
    with open('label_encoder_classes.json', 'w') as f:
        json.dump(le_classes, f)
    print("Saved label encoder classes to 'label_encoder_classes.json'.")
