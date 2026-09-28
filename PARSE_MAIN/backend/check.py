import pandas as pd

df = pd.read_csv(r'C:\Users\Admin\Desktop\sih26160\dataset_labels_phase1.csv')

print("="*100)
print("Dataset1 Info:")
print("\n",df.head())
print("\n",df.info())
print("\n",df.columns)
print("\n",df.shape)


df2 = pd.read_csv(r'C:\Users\Admin\Desktop\sih26160\dataset_labels_phase2.csv')

print("="*100)
print("Dataset2 Info:")
print("\n",df2.head())
print("\n",df2.info())
print("\n",df2.columns)
print("\n",df2.shape)

df3 = pd.read_csv(r'C:\Users\Admin\Desktop\sih26160\dataset_labels_phase3.csv')

print("="*100)
print("Dataset3 Info:")
print("\n",df3.head())
print("\n",df3.info())
print("\n",df3.columns)
print("\n",df3.shape)