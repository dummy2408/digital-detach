import os
import json
import warnings
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score, learning_curve
from sklearn.preprocessing import StandardScaler, OneHotEncoder, label_binarize
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, f1_score, confusion_matrix, roc_curve, auc, precision_recall_curve, average_precision_score
from sklearn.calibration import calibration_curve

from sklearn.tree import DecisionTreeClassifier

warnings.filterwarnings('ignore')

CLASS_NAMES = ['Low Risk', 'Moderate Risk', 'High Risk']
COLORS = ['#2563EB', '#F59E0B', '#EF4444']

def save_fig(fig, path):
    fig.savefig(path, dpi=150, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.close(fig)

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    eval_dir = os.path.join(base_dir, 'evaluation')
    perf_dir = os.path.join(eval_dir, 'model_performance')
    analysis_dir = os.path.join(eval_dir, 'model_analysis')
    os.makedirs(perf_dir, exist_ok=True)
    os.makedirs(analysis_dir, exist_ok=True)
    
    df = pd.read_csv(os.path.join(base_dir, '..', '..', 'dataset.csv'))
    df = df.drop(columns=['ID', 'Name', 'Unnamed: 25'], errors='ignore')
    
    # Feature Engineering exactly like XGBoost
    df['Total_Screen_Time'] = df['Time_on_Social_Media'] + df['Time_on_Gaming'] + df['Time_on_Education']
    df['Entertainment_Ratio'] = ((df['Time_on_Social_Media'] + df['Time_on_Gaming']) / df['Total_Screen_Time']).fillna(0)
    df['Sleep_Deficit'] = 8.0 - df['Sleep_Hours']
    df['Weekend_Extra'] = df['Weekend_Usage_Hours'] - df['Daily_Usage_Hours']
    
    max_usage = df['Daily_Usage_Hours'].max()
    max_checks = df['Phone_Checks_Per_Day'].max()
    max_apps = df['Apps_Used_Daily'].max()
    
    composite_score = (
        0.40 * (df['Addiction_Level'] / 10.0) +
        0.25 * (df['Daily_Usage_Hours'] / max_usage) +
        0.15 * (df['Phone_Checks_Per_Day'] / max_checks) +
        0.10 * (df['Apps_Used_Daily'] / max_apps) +
        0.10 * (df['Entertainment_Ratio'])
    )
    q33 = composite_score.quantile(0.33)
    q66 = composite_score.quantile(0.66)
    
    def classify_risk(score):
        if score < q33: return 0
        elif score < q66: return 1
        else: return 2
    
    df['Risk_Class'] = composite_score.apply(classify_risk)
    
    categorical_cols = ['Gender', 'School_Grade', 'Location', 'Phone_Usage_Purpose']
    numerical_cols = [
        'Age', 'Daily_Usage_Hours', 'Sleep_Hours', 'Academic_Performance',
        'Social_Interactions', 'Exercise_Hours', 'Anxiety_Level', 'Depression_Level',
        'Self_Esteem', 'Parental_Control', 'Screen_Time_Before_Bed',
        'Phone_Checks_Per_Day', 'Apps_Used_Daily', 'Time_on_Social_Media',
        'Time_on_Gaming', 'Time_on_Education', 'Family_Communication',
        'Weekend_Usage_Hours', 'Total_Screen_Time', 'Entertainment_Ratio', 
        'Sleep_Deficit', 'Weekend_Extra',
    ]
    
    for col in numerical_cols:
        df[col] = df[col].fillna(df[col].median())
    for col in categorical_cols:
        df[col] = df[col].fillna(df[col].mode()[0])
    
    X = df[numerical_cols + categorical_cols]
    y = df['Risk_Class']
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numerical_cols),
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), categorical_cols)
        ]
    )
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    model = DecisionTreeClassifier(random_state=42)
    
    pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('model', model)
    ])
    
    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)
    y_proba = pipeline.predict_proba(X_test)
    
    acc = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, average='macro')
    
    metrics = {
        'Accuracy': float(acc),
        'F1_Macro': float(f1)
    }
    with open(os.path.join(eval_dir, 'metrics.json'), 'w') as f:
        json.dump(metrics, f, indent=4)
        
    # --- MODEL PERFORMANCE PLOTS ---
    cm = confusion_matrix(y_test, y_pred)
    fig, ax = plt.subplots(figsize=(6, 5))
    im = ax.imshow(cm, interpolation='nearest', cmap='Blues', aspect='auto')
    ax.set_xticks(range(3)); ax.set_yticks(range(3))
    ax.set_xticklabels(CLASS_NAMES); ax.set_yticklabels(CLASS_NAMES)
    for i in range(3):
        for j in range(3):
            color = 'white' if cm[i, j] > cm.max() / 2 else 'black'
            ax.text(j, i, str(cm[i, j]), ha='center', va='center', color=color)
    fig.colorbar(im, ax=ax)
    save_fig(fig, os.path.join(perf_dir, 'confusion_matrix.png'))
    
    y_test_bin = label_binarize(y_test, classes=[0, 1, 2])
    
    fig, ax = plt.subplots(figsize=(6.5, 5.5))
    for i, (name, color) in enumerate(zip(CLASS_NAMES, COLORS)):
        fpr, tpr, _ = roc_curve(y_test_bin[:, i], y_proba[:, i])
        ax.plot(fpr, tpr, color=color, label=f'{name} (AUC = {auc(fpr, tpr):.3f})')
    ax.plot([0, 1], [0, 1], 'k--')
    ax.legend(loc='lower right')
    save_fig(fig, os.path.join(perf_dir, 'roc_curves.png'))
    
    fig, ax = plt.subplots(figsize=(6.5, 5.5))
    for i, (name, color) in enumerate(zip(CLASS_NAMES, COLORS)):
        prec, rec, _ = precision_recall_curve(y_test_bin[:, i], y_proba[:, i])
        ax.plot(rec, prec, color=color, label=f'{name} (AP = {average_precision_score(y_test_bin[:, i], y_proba[:, i]):.3f})')
    ax.legend(loc='lower left')
    save_fig(fig, os.path.join(perf_dir, 'precision_recall.png'))
    
    fig, ax = plt.subplots(figsize=(6.5, 5.5))
    for i, (name, color) in enumerate(zip(CLASS_NAMES, COLORS)):
        prob_true, prob_pred = calibration_curve(y_test_bin[:, i], y_proba[:, i], n_bins=8, strategy='uniform')
        ax.plot(prob_pred, prob_true, marker='o', color=color, label=name)
    ax.plot([0, 1], [0, 1], 'k--')
    ax.legend(loc='lower right')
    save_fig(fig, os.path.join(perf_dir, 'calibration_curve.png'))
    
    # --- MODEL ANALYSIS PLOTS ---
    fig, ax = plt.subplots(figsize=(10, 8))
    corr_matrix = df[numerical_cols].corr()
    im = ax.imshow(corr_matrix, cmap='RdBu_r', vmin=-1, vmax=1, aspect='auto')
    ax.set_xticks(range(len(numerical_cols)))
    ax.set_yticks(range(len(numerical_cols)))
    ax.set_xticklabels(numerical_cols, rotation=45, ha='right', fontsize=6)
    ax.set_yticklabels(numerical_cols, fontsize=6)
    fig.colorbar(im, ax=ax)
    save_fig(fig, os.path.join(analysis_dir, 'correlation_heatmap.png'))
    
    fig, ax = plt.subplots(figsize=(8, 6))
    try:
        model_step = pipeline.named_steps['model']
        feature_names = preprocessor.get_feature_names_out()
        if hasattr(model_step, 'feature_importances_'):
            importances = model_step.feature_importances_
        elif hasattr(model_step, 'coef_'):
            importances = np.abs(model_step.coef_[0])
        else:
            importances = np.zeros(len(feature_names))
            
        top_n = 15
        top_idx = np.argsort(importances)[-top_n:]
        clean_names = [n.replace('num__', '').replace('cat__', '') for n in feature_names[top_idx]]
        ax.barh(range(top_n), importances[top_idx], color='#2563EB')
        ax.set_yticks(range(top_n))
        ax.set_yticklabels(clean_names, fontsize=8)
    except Exception as e:
        ax.text(0.5, 0.5, f"Could not compute importance\n{e}", ha='center')
    save_fig(fig, os.path.join(analysis_dir, 'feature_importance.png'))
    
    fig, ax = plt.subplots(figsize=(7, 5))
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
    train_sizes, train_scores, val_scores = learning_curve(
        pipeline, X_train, y_train, cv=cv, scoring='f1_macro', n_jobs=-1, train_sizes=np.linspace(0.1, 1.0, 5)
    )
    train_mean = train_scores.mean(axis=1)
    val_mean = val_scores.mean(axis=1)
    ax.plot(train_sizes, train_mean, 'o-', color='#2563EB', label='Training')
    ax.plot(train_sizes, val_mean, 'o-', color='#EF4444', label='Validation')
    ax.legend(loc='lower right')
    save_fig(fig, os.path.join(analysis_dir, 'learning_curves.png'))
    
if __name__ == '__main__':
    main()
