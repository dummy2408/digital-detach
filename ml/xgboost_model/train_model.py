"""
Smartphone Addiction Detector — Model Training & Evaluation
============================================================
Trains an XGBoost classifier on raw2.csv, generates structured
evaluation plots, and saves the final pipeline + metadata.

Anti-overfitting measures:
  - max_depth=3 (shallow trees)
  - min_child_weight=10 (conservative splits)
  - gamma=1.0, reg_alpha=1.0, reg_lambda=5.0 (heavy regularization)
  - subsample=0.6, colsample_bytree=0.6 (aggressive stochasticity)
  - learning_rate=0.03 with n_estimators=300 (slow, careful learning)
  - Stratified 5-fold CV to validate generalization
"""

import os
import json
import warnings
import pandas as pd
import numpy as np
import joblib
import matplotlib
matplotlib.use('Agg')  
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score, learning_curve
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.cluster import KMeans
from sklearn.metrics import (
    classification_report, accuracy_score, f1_score, cohen_kappa_score,
    matthews_corrcoef, confusion_matrix, roc_curve, auc,
    precision_recall_curve, average_precision_score
)
from sklearn.calibration import calibration_curve
from sklearn.pipeline import Pipeline
from sklearn.utils.class_weight import compute_sample_weight
from xgboost import XGBClassifier

warnings.filterwarnings('ignore')

plt.rcParams.update({
    'figure.facecolor': '#FAFAFA',
    'axes.facecolor': '#FAFAFA',
    'axes.edgecolor': '#CCCCCC',
    'axes.labelcolor': '#333333',
    'text.color': '#333333',
    'xtick.color': '#555555',
    'ytick.color': '#555555',
    'grid.color': '#E0E0E0',
    'grid.alpha': 0.6,
    'font.family': 'sans-serif',
    'font.size': 10,
    'axes.titlesize': 13,
    'axes.titleweight': 'bold',
    'figure.titlesize': 15,
    'figure.titleweight': 'bold',
})

COLORS = ['#2563EB', '#F59E0B', '#EF4444']  
CLASS_NAMES = ['Low Risk', 'Moderate Risk', 'High Risk']

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EVAL_DIR = os.path.join(BASE_DIR, 'evaluation')
DIRS = {
    'data_quality': os.path.join(EVAL_DIR, 'data_quality'),
    'model_performance': os.path.join(EVAL_DIR, 'model_performance'),
    'model_analysis': os.path.join(EVAL_DIR, 'model_analysis'),
}
for d in DIRS.values():
    os.makedirs(d, exist_ok=True)

def save_fig(fig, directory, filename):
    """Save a figure and close it to free memory."""
    path = os.path.join(directory, filename)
    fig.savefig(path, dpi=150, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"    [OK] Saved {os.path.relpath(path, BASE_DIR)}")

print("=" * 60)
print("  SMARTPHONE ADDICTION MODEL — TRAINING PIPELINE")
print("=" * 60)

print("\n[1/7] Loading data...")
df = pd.read_csv(os.path.join(BASE_DIR, 'raw2.csv'))
df = df.drop(columns=['ID', 'Name', 'Unnamed: 25'], errors='ignore')
print(f"  Dataset: {df.shape[0]} rows × {df.shape[1]} columns")

print("[2/7] Engineering features...")

df['Total_Screen_Time'] = (
    df['Time_on_Social_Media'] + df['Time_on_Gaming'] + df['Time_on_Education']
)
df['Entertainment_Ratio'] = (
    (df['Time_on_Social_Media'] + df['Time_on_Gaming']) / df['Total_Screen_Time']
).fillna(0)
df['Sleep_Deficit'] = 8.0 - df['Sleep_Hours']
df['Weekend_Extra'] = df['Weekend_Usage_Hours'] - df['Daily_Usage_Hours']

print("  Added: Total_Screen_Time, Entertainment_Ratio, Sleep_Deficit, Weekend_Extra")

print("[3/7] Creating composite risk target...")

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
    if score < q33:
        return 0  
    elif score < q66:
        return 1  
    else:
        return 2  

df['Risk_Class'] = composite_score.apply(classify_risk)

print(f"  Composite score range: {composite_score.min():.3f} — {composite_score.max():.3f}")
print(f"  Thresholds: Low < {q33:.3f} | Moderate < {q66:.3f} | High >= {q66:.3f}")
print(f"  Class distribution:")
for cls_id, name in enumerate(CLASS_NAMES):
    count = (df['Risk_Class'] == cls_id).sum()
    pct = count / len(df) * 100
    print(f"    {name}: {count} ({pct:.1f}%)")

print("\n[4/7] Setting up features...")

categorical_cols = ['Gender', 'School_Grade', 'Location', 'Phone_Usage_Purpose']
numerical_cols = [
    'Age', 'Daily_Usage_Hours', 'Sleep_Hours', 'Academic_Performance',
    'Social_Interactions', 'Exercise_Hours', 'Anxiety_Level', 'Depression_Level',
    'Self_Esteem', 'Parental_Control', 'Screen_Time_Before_Bed',
    'Phone_Checks_Per_Day', 'Apps_Used_Daily', 'Time_on_Social_Media',
    'Time_on_Gaming', 'Time_on_Education', 'Family_Communication',
    'Weekend_Usage_Hours',
    
    'Total_Screen_Time', 'Entertainment_Ratio', 'Sleep_Deficit', 'Weekend_Extra',
]

features = numerical_cols + categorical_cols
X = df[features]
y = df['Risk_Class']
print(f"  Using {len(features)} features ({len(numerical_cols)} numeric + {len(categorical_cols)} categorical)")

print("\n[5/7] Generating data quality plots...")

fig, ax = plt.subplots(figsize=(7, 4.5))
counts = [int((y == i).sum()) for i in range(3)]
bars = ax.bar(CLASS_NAMES, counts, color=COLORS, edgecolor='white', linewidth=1.5, width=0.55)
for bar, count in zip(bars, counts):
    ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 15,
            str(count), ha='center', va='bottom', fontweight='bold', fontsize=11)
ax.set_title('Class Distribution')
ax.set_ylabel('Sample Count')
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.set_ylim(0, max(counts) * 1.15)
fig.tight_layout()
save_fig(fig, DIRS['data_quality'], 'class_distribution.png')

fig, ax = plt.subplots(figsize=(8, 5))
missing = df[features].isnull().sum().sort_values(ascending=True)
colors_bar = ['#EF4444' if v > 0 else '#D1D5DB' for v in missing.values]
ax.barh(range(len(missing)), missing.values, color=colors_bar, height=0.6)
ax.set_yticks(range(len(missing)))
ax.set_yticklabels([n.replace('_', ' ') for n in missing.index], fontsize=7)
ax.set_title('Missing Values per Feature')
ax.set_xlabel('Missing Count')
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
fig.tight_layout()
save_fig(fig, DIRS['data_quality'], 'missing_values.png')

fig, ax = plt.subplots(figsize=(8, 5.5))
corr = df[numerical_cols + ['Risk_Class']].corr()['Risk_Class'].drop('Risk_Class').sort_values()
bar_colors = ['#2563EB' if v >= 0 else '#EF4444' for v in corr.values]
ax.barh(range(len(corr)), corr.values, color=bar_colors, height=0.6)
ax.set_yticks(range(len(corr)))
ax.set_yticklabels([n.replace('_', ' ') for n in corr.index], fontsize=7)
ax.set_title('Feature Correlation with Risk Class')
ax.set_xlabel('Pearson r')
ax.axvline(x=0, color='#999', linewidth=0.8, linestyle='--')
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
fig.tight_layout()
save_fig(fig, DIRS['data_quality'], 'feature_target_correlation.png')

print("\n[6/7] Training model...")

preprocessor = ColumnTransformer(
    transformers=[
        ('num', StandardScaler(), numerical_cols),
        ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), categorical_cols)
    ])

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

sample_weights = compute_sample_weight('balanced', y_train)

pipeline = Pipeline([
    ('preprocessor', preprocessor),
    ('model', XGBClassifier(
        n_estimators=300,
        max_depth=3,              
        learning_rate=0.03,       
        min_child_weight=10,      
        subsample=0.6,            
        colsample_bytree=0.6,    
        gamma=1.0,                
        reg_alpha=1.0,            
        reg_lambda=5.0,           
        eval_metric='mlogloss',
        random_state=42,
        n_jobs=-1
    ))
])

pipeline.fit(X_train, y_train, model__sample_weight=sample_weights)

print("  Running 5-fold cross-validation...")
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
cv_scores = cross_val_score(pipeline, X_train, y_train, cv=cv, scoring='f1_macro', n_jobs=-1)
print(f"  CV F1 (macro): {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

y_pred = pipeline.predict(X_test)
y_proba = pipeline.predict_proba(X_test)

acc = accuracy_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred, average='macro')
kappa = cohen_kappa_score(y_test, y_pred)
mcc = matthews_corrcoef(y_test, y_pred)

y_train_pred = pipeline.predict(X_train)
train_acc = accuracy_score(y_train, y_train_pred)
train_f1 = f1_score(y_train, y_train_pred, average='macro')
overfit_gap = train_f1 - f1

print(f"\n  Train Accuracy: {train_acc:.4f}  |  Test Accuracy: {acc:.4f}")
print(f"  Train F1 Macro: {train_f1:.4f}  |  Test F1 Macro:  {f1:.4f}")
print(f"  Overfit Gap:    {overfit_gap:.4f}  {'[!] High' if overfit_gap > 0.10 else '[OK] Acceptable'}")
print(f"  Cohen's Kappa:  {kappa:.4f}")
print(f"  MCC:            {mcc:.4f}")
print(f"\n{'='*60}")
print("  CLASSIFICATION REPORT")
print(f"{'='*60}")
print(classification_report(y_test, y_pred, target_names=CLASS_NAMES))

print("[7/7] Generating evaluation plots...")

cm = confusion_matrix(y_test, y_pred)

fig, ax = plt.subplots(figsize=(6, 5))
im = ax.imshow(cm, interpolation='nearest', cmap='Blues', aspect='auto')
ax.set_xticks(range(3))
ax.set_yticks(range(3))
ax.set_xticklabels(CLASS_NAMES, fontsize=9)
ax.set_yticklabels(CLASS_NAMES, fontsize=9)
ax.set_xlabel('Predicted')
ax.set_ylabel('Actual')
ax.set_title('Confusion Matrix')
for i in range(3):
    for j in range(3):
        color = 'white' if cm[i, j] > cm.max() / 2 else '#333'
        ax.text(j, i, str(cm[i, j]), ha='center', va='center', fontweight='bold',
                fontsize=14, color=color)
fig.colorbar(im, ax=ax, shrink=0.8)
fig.tight_layout()
save_fig(fig, DIRS['model_performance'], 'confusion_matrix.png')

fig, ax = plt.subplots(figsize=(6.5, 5.5))
from sklearn.preprocessing import label_binarize
y_test_bin = label_binarize(y_test, classes=[0, 1, 2])
for i, (name, color) in enumerate(zip(CLASS_NAMES, COLORS)):
    fpr, tpr, _ = roc_curve(y_test_bin[:, i], y_proba[:, i])
    roc_auc = auc(fpr, tpr)
    ax.plot(fpr, tpr, color=color, linewidth=2, label=f'{name} (AUC = {roc_auc:.3f})')
ax.plot([0, 1], [0, 1], 'k--', linewidth=0.8, alpha=0.5)
ax.set_xlim([0, 1])
ax.set_ylim([0, 1.02])
ax.set_xlabel('False Positive Rate')
ax.set_ylabel('True Positive Rate')
ax.set_title('ROC Curves (One-vs-Rest)')
ax.legend(loc='lower right', fontsize=9)
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
fig.tight_layout()
save_fig(fig, DIRS['model_performance'], 'roc_curves.png')

fig, ax = plt.subplots(figsize=(6.5, 5.5))
for i, (name, color) in enumerate(zip(CLASS_NAMES, COLORS)):
    prec, rec, _ = precision_recall_curve(y_test_bin[:, i], y_proba[:, i])
    ap = average_precision_score(y_test_bin[:, i], y_proba[:, i])
    ax.plot(rec, prec, color=color, linewidth=2, label=f'{name} (AP = {ap:.3f})')
ax.set_xlabel('Recall')
ax.set_ylabel('Precision')
ax.set_title('Precision-Recall Curves')
ax.legend(loc='lower left', fontsize=9)
ax.set_xlim([0, 1])
ax.set_ylim([0, 1.02])
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
fig.tight_layout()
save_fig(fig, DIRS['model_performance'], 'precision_recall.png')

fig, ax = plt.subplots(figsize=(6.5, 5.5))
for i, (name, color) in enumerate(zip(CLASS_NAMES, COLORS)):
    prob_true, prob_pred = calibration_curve(
        y_test_bin[:, i], y_proba[:, i], n_bins=8, strategy='uniform'
    )
    ax.plot(prob_pred, prob_true, marker='o', color=color, linewidth=2,
            markersize=5, label=name)
ax.plot([0, 1], [0, 1], 'k--', linewidth=0.8, alpha=0.5, label='Perfect')
ax.set_xlabel('Mean Predicted Probability')
ax.set_ylabel('Fraction of Positives')
ax.set_title('Calibration Curves')
ax.legend(loc='lower right', fontsize=9)
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
fig.tight_layout()
save_fig(fig, DIRS['model_performance'], 'calibration_curves.png')

fig, ax = plt.subplots(figsize=(8, 6))
model_step = pipeline.named_steps['model']
preprocessor_step = pipeline.named_steps['preprocessor']
feature_names = preprocessor_step.get_feature_names_out()
importances = model_step.feature_importances_
top_n = 15
top_idx = np.argsort(importances)[-top_n:]
clean_names = [n.replace('num__', '').replace('cat__', '').replace('_', ' ') for n in feature_names[top_idx]]
ax.barh(range(top_n), importances[top_idx], color='#2563EB', height=0.6, edgecolor='white')
ax.set_yticks(range(top_n))
ax.set_yticklabels(clean_names, fontsize=8)
ax.set_xlabel('Importance (Gain)')
ax.set_title(f'Top {top_n} Feature Importances')
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
fig.tight_layout()
save_fig(fig, DIRS['model_analysis'], 'feature_importance.png')

fig, ax = plt.subplots(figsize=(7, 5))
train_sizes, train_scores, val_scores = learning_curve(
    pipeline, X_train, y_train,
    cv=cv, scoring='f1_macro', n_jobs=-1,
    train_sizes=np.linspace(0.1, 1.0, 8),
    random_state=42
)
train_mean = train_scores.mean(axis=1)
train_std = train_scores.std(axis=1)
val_mean = val_scores.mean(axis=1)
val_std = val_scores.std(axis=1)

ax.fill_between(train_sizes, train_mean - train_std, train_mean + train_std, alpha=0.15, color='#2563EB')
ax.fill_between(train_sizes, val_mean - val_std, val_mean + val_std, alpha=0.15, color='#EF4444')
ax.plot(train_sizes, train_mean, 'o-', color='#2563EB', linewidth=2, markersize=5, label='Training')
ax.plot(train_sizes, val_mean, 'o-', color='#EF4444', linewidth=2, markersize=5, label='Validation')
final_gap = train_mean[-1] - val_mean[-1]
ax.set_title(f'Learning Curves (Gap: {final_gap:.4f})')
ax.set_xlabel('Training Samples')
ax.set_ylabel('F1 Macro')
ax.legend(loc='lower right', fontsize=10)
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.grid(True, alpha=0.3)
fig.tight_layout()
save_fig(fig, DIRS['model_analysis'], 'learning_curves.png')

fig, ax = plt.subplots(figsize=(10, 8))
corr_matrix = df[numerical_cols].corr()
im = ax.imshow(corr_matrix, cmap='RdBu_r', vmin=-1, vmax=1, aspect='auto')
ax.set_xticks(range(len(numerical_cols)))
ax.set_yticks(range(len(numerical_cols)))
clean_num = [n.replace('_', ' ') for n in numerical_cols]
ax.set_xticklabels(clean_num, rotation=45, ha='right', fontsize=6.5)
ax.set_yticklabels(clean_num, fontsize=6.5)
ax.set_title('Feature Correlation Heatmap')
fig.colorbar(im, ax=ax, shrink=0.8, label='Pearson r')
fig.tight_layout()
save_fig(fig, DIRS['model_analysis'], 'correlation_heatmap.png')

print("\n[7.5/7] Training Persona Clustering Model...")
cluster_cols = ['Time_on_Social_Media', 'Time_on_Gaming', 'Time_on_Education', 'Total_Screen_Time', 'Phone_Checks_Per_Day']
X_cluster = df[cluster_cols].fillna(0)

cluster_scaler = StandardScaler()
X_cluster_scaled = cluster_scaler.fit_transform(X_cluster)

kmeans = KMeans(n_clusters=4, random_state=42, n_init=10)
df['Cluster'] = kmeans.fit_predict(X_cluster_scaled)

cluster_profiles = df.groupby('Cluster')[cluster_cols].mean()

cluster_mapping = {}
personas_available = [
    {"title": "Doom Scroller", "emoji": "📱", "desc": "Unhealthy obsession with social media.", "color": "#ef4444"},
    {"title": "Dedicated Gamer", "emoji": "🎮", "desc": "High entertainment focus.", "color": "#8b5cf6"},
    {"title": "Productivity Master", "emoji": "📚", "desc": "Focused on learning & work.", "color": "#3b82f6"},
    {"title": "Balanced Explorer", "emoji": "🧘", "desc": "Healthy digital habits.", "color": "#22c55e"}
]

used_c = set()
c_soc = cluster_profiles['Time_on_Social_Media'].idxmax()
cluster_mapping[int(c_soc)] = personas_available[0]
used_c.add(c_soc)

c_gam = cluster_profiles.drop(used_c)['Time_on_Gaming'].idxmax()
cluster_mapping[int(c_gam)] = personas_available[1]
used_c.add(c_gam)

c_edu = cluster_profiles.drop(used_c)['Time_on_Education'].idxmax()
cluster_mapping[int(c_edu)] = personas_available[2]
used_c.add(c_edu)

c_bal = list(set([0, 1, 2, 3]) - used_c)[0]
cluster_mapping[int(c_bal)] = personas_available[3]

print("  Mapped Clusters:")
for c, p in cluster_mapping.items():
    print(f"    Cluster {c} -> {p['title']}")

print("\n  Saving artifacts...")

joblib.dump(pipeline, os.path.join(BASE_DIR, 'best_model.pkl'))
print(f"  [OK] Model saved to best_model.pkl")

joblib.dump(kmeans, os.path.join(BASE_DIR, 'kmeans_model.pkl'))
joblib.dump(cluster_scaler, os.path.join(BASE_DIR, 'kmeans_scaler.pkl'))
with open(os.path.join(BASE_DIR, 'cluster_mapping.json'), 'w') as f:
    json.dump(cluster_mapping, f, indent=2)
print(f"  [OK] KMeans models and mapping saved")

metadata = {
    'features': features,
    'numerical_cols': numerical_cols,
    'categorical_cols': categorical_cols,
    'class_names': CLASS_NAMES,
    'composite_weights': {
        'addiction_level': 0.40,
        'daily_usage': 0.25,
        'phone_checks': 0.15,
        'apps_used': 0.10,
        'entertainment_ratio': 0.10
    },
    'thresholds': {'q33': float(q33), 'q66': float(q66)}
}
with open(os.path.join(BASE_DIR, 'model_metadata.json'), 'w') as f:
    json.dump(metadata, f, indent=2)
print(f"  [OK] Metadata saved to model_metadata.json")

metrics = {
    'train_accuracy': round(float(train_acc), 4),
    'test_accuracy': round(float(acc), 4),
    'train_f1_macro': round(float(train_f1), 4),
    'test_f1_macro': round(float(f1), 4),
    'overfit_gap': round(float(overfit_gap), 4),
    'cv_f1_macro_mean': round(float(cv_scores.mean()), 4),
    'cv_f1_macro_std': round(float(cv_scores.std()), 4),
    'cohens_kappa': round(float(kappa), 4),
    'mcc': round(float(mcc), 4),
    'confusion_matrix': cm.tolist(),
    'class_names': CLASS_NAMES,
    'test_size': int(len(y_test)),
    'train_size': int(len(y_train)),
    'features_used': len(features),
    'learning_curve_final_gap': round(float(final_gap), 4),
}
with open(os.path.join(EVAL_DIR, 'metrics.json'), 'w') as f:
    json.dump(metrics, f, indent=2)
print(f"  [OK] Metrics saved to evaluation/metrics.json")

print(f"\n{'='*60}")
print(f"  TRAINING COMPLETE")
print(f"{'='*60}")
print(f"  Test Accuracy:  {acc:.4f}")
print(f"  Test F1 Macro:  {f1:.4f}")
print(f"  Overfit Gap:    {overfit_gap:.4f}")
print(f"  CV F1 Macro:    {cv_scores.mean():.4f} +/- {cv_scores.std():.4f}")
print(f"{'='*60}")
