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
mongo_url = "mongodb://localhost:27017"  # Remplace par ton URL MongoDB
client = MongoClient(mongo_url)
db = client['harvestflow']  # Nom de ta base de données
fs = GridFS(db, collection="wheat_files")  # Collection GridFS utilisée pour l'upload

# Charger les données depuis GridFS
file_name = "wheat_data.csv"  # Nom du fichier dans GridFS
grid_file = fs.find_one({"filename": file_name})
if not grid_file:
    print(json.dumps({"error": f"Fichier {file_name} non trouvé dans GridFS"}))
    sys.exit(1)

# Lire le fichier CSV depuis GridFS
csv_data = grid_file.read()
df = pd.read_csv(io.BytesIO(csv_data))
df = df.dropna()
df['tonnes_per_hectare'] = df['hg/ha_yield'] / 10000

# Récupérer les arguments (valeurs utilisateur + pays)
rainfall_user = float(sys.argv[1])
pesticides_user = float(sys.argv[2])
temp_user = float(sys.argv[3])
country = sys.argv[4]

# Filtrer les données selon le pays
df_country = df[df['Area'] == country]
if df_country.empty:
    print(json.dumps({"error": f"Aucune donnée trouvée pour le pays {country}"}))
    sys.exit(1)

# Préparer les données pour ce pays
X = df_country[['average_rain_fall_mm_per_year', 'pesticides_tonnes', 'avg_temp']]
y = df_country['tonnes_per_hectare']
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Entraîner le modèle
model_rf = RandomForestRegressor(n_estimators=100, random_state=42)
model_rf.fit(X_scaled, y)

# Valeurs de base
base_values = [rainfall_user, pesticides_user, temp_user]

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
        if feature_idx == 0 and val < 50:  # Contrainte précipitations
            pred = 0
        yields.append(pred)
    return yields

# Extraire les plages réelles depuis les données du pays
rainfall_min = df_country['average_rain_fall_mm_per_year'].min()
rainfall_max = df_country['average_rain_fall_mm_per_year'].max()
pesticides_min = df_country['pesticides_tonnes'].min()
pesticides_max = df_country['pesticides_tonnes'].max()
temp_min = df_country['avg_temp'].min()
temp_max = df_country['avg_temp'].max()

# Définir les plages basées sur les min/max (20 points pour chaque)
rainfall_ranges = np.linspace(rainfall_min, rainfall_max, 20).tolist()
pesticides_ranges = np.linspace(pesticides_min, pesticides_max, 20).tolist()
temp_ranges = np.linspace(temp_min, temp_max, 20).tolist()

# Prédire les rendements
rainfall_yields = predict_yield_for_variable(0, rainfall_ranges, base_values)
pesticides_yields = predict_yield_for_variable(1, pesticides_ranges, base_values)
temp_yields = predict_yield_for_variable(2, temp_ranges, base_values)

# Préparer les données pour le frontend
response = {
    "rainfall": {"ranges": rainfall_ranges, "yields": rainfall_yields, "user_value": rainfall_user},
    "pesticides": {"ranges": pesticides_ranges, "yields": pesticides_yields, "user_value": pesticides_user},
    "temp": {"ranges": temp_ranges, "yields": temp_yields, "user_value": temp_user},
    "current_yield": current_yield,
    "country": country
}

# Retourner les données en JSON
print(json.dumps(response))

# Fermer la connexion MongoDB
client.close()