import sys
import json
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from pymongo import MongoClient
from gridfs import GridFS
import io

# Connexion à MongoDB
mongo_url = "mongodb://localhost:27017"
client = MongoClient(mongo_url)
db = client['harvestflow']
fs = GridFS(db, collection="wheat_files")

# Charger les données depuis GridFS
file_name = "wheat_data.csv"
grid_file = fs.find_one({"filename": file_name})
if not grid_file:
    print(json.dumps({"error": f"Fichier {file_name} non trouvé dans GridFS"}))
    sys.exit(1)

csv_data = grid_file.read()
df = pd.read_csv(io.BytesIO(csv_data))
df = df.dropna()
df['tonnes_per_hectare'] = df['hg/ha_yield'] / 10000

# Récupérer les arguments (sans rainfall)
pesticides_user = float(sys.argv[1])
temp_user = float(sys.argv[2])
country = sys.argv[3]

# Filtrer les données selon le pays
df_country = df[df['Area'] == country]
if df_country.empty:
    print(json.dumps({"error": f"Aucune donnée trouvée pour le pays {country}"}))
    sys.exit(1)

# Préparer les données pour ce pays (sans rainfall)
X = df_country[['pesticides_tonnes', 'avg_temp']]
y = df_country['tonnes_per_hectare']
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Entraîner le modèle
model_rf = RandomForestRegressor(n_estimators=100, random_state=42)
model_rf.fit(X_scaled, y)

# Valeurs de base (sans rainfall)
base_values = [pesticides_user, temp_user]

# Prédire le rendement actuel
current_yield = model_rf.predict(scaler.transform([base_values]))[0]

# Fonction de prédiction
def predict_yield_for_variable(feature_idx, ranges, base_values):
    yields = []
    for val in ranges:
        input_data = base_values.copy()
        input_data[feature_idx] = val
        scaled_input = scaler.transform([input_data])
        pred = model_rf.predict(scaled_input)[0]
        yields.append(pred)
    return yields

# Extraire les plages réelles depuis les données du pays (sans rainfall)
pesticides_min = df_country['pesticides_tonnes'].min()
pesticides_max = df_country['pesticides_tonnes'].max()
temp_min = df_country['avg_temp'].min()
temp_max = df_country['avg_temp'].max()

# Définir les plages basées sur les min/max (20 points pour chaque)
pesticides_ranges = np.linspace(pesticides_min, pesticides_max, 20).tolist()
temp_ranges = np.linspace(temp_min, temp_max, 20).tolist()

# Prédire les rendements
pesticides_yields = predict_yield_for_variable(0, pesticides_ranges, base_values)
temp_yields = predict_yield_for_variable(1, temp_ranges, base_values)

# Préparer les données pour le frontend (sans rainfall)
response = {
    "pesticides": {"ranges": pesticides_ranges, "yields": pesticides_yields, "user_value": pesticides_user},
    "temp": {"ranges": temp_ranges, "yields": temp_yields, "user_value": temp_user},
    "current_yield": current_yield,
    "country": country
}

# Retourner les données en JSON
print(json.dumps(response))

# Fermer la connexion MongoDB
client.close()