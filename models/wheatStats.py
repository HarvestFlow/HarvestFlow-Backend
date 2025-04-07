# backend/models/wheatStats.py
import pandas as pd
import matplotlib.pyplot as plt
import sys
import json
import os

# Charger les données depuis le fichier CSV (chemin relatif)
df = pd.read_csv("C:/Users/DHIA/Desktop/PFE HARVEST8FLOW/HARVESTFLOW-BACKEND/yieledd.csv")

def display_country_stats(country_name):
    # Filtrer les données pour le pays spécifié (insensible à la casse)
    country_data = df[df['Area'].str.lower() == country_name.lower()]

    if country_data.empty:
        return {"error": f"Aucune donnée trouvée pour le pays {country_name}"}

    # Nom du pays et code (pour référence)
    country_name = country_data['Area'].iloc[0]
    country_code = country_data['Area Code (M49)'].iloc[0]

    # Créer des séries séparées pour chaque élément avec les années comme index
    area_harvested = country_data[country_data['Element'] == 'Area harvested'].set_index('Year')['Value']
    yield_data = country_data[country_data['Element'] == 'Yield'].set_index('Year')['Value']
    production = country_data[country_data['Element'] == 'Production'].set_index('Year')['Value']
    years = production.index  # Utiliser les années de la production comme référence

    # Résumé des données (dernières 5 années disponibles)
    summary_df = pd.DataFrame({
        'Année': years[-5:],
        'Superficie Récoltée (ha)': area_harvested.values[-5:],
        'Rendement (kg/ha)': yield_data.values[-5:],
        'Production (t)': production.values[-5:]
    })

    # Statistiques globales
    stats = {
        "production_mean": float(production.mean()),
        "yield_mean": float(yield_data.mean()),
        "area_harvested_mean": float(area_harvested.mean()),
        "production_max_year": int(production.idxmax()),
        "production_max": float(production.max()),
        "production_min_year": int(production.idxmin()),
        "production_min": float(production.min()),
    }

    # Créer un dossier pour les graphiques
    if not os.path.exists('public/charts'):
        os.makedirs('public/charts')

    # Visualisation des tendances
    plt.figure(figsize=(12, 6))

    # Graphique 1 : Production au fil du temps
    plt.subplot(1, 2, 1)
    plt.plot(years, production, marker='o', label='Production (t)', color='blue')
    plt.title(f'Production de blé - {country_name}')
    plt.xlabel('Année')
    plt.ylabel('Production (tonnes)')
    plt.grid(True)
    plt.xticks(rotation=45)

    # Graphique 2 : Rendement au fil du temps
    plt.subplot(1, 2, 2)
    plt.plot(years, yield_data, marker='o', label='Rendement (kg/ha)', color='green')
    plt.title(f'Rendement de blé - {country_name}')
    plt.xlabel('Année')
    plt.ylabel('Rendement (kg/ha)')
    plt.grid(True)
    plt.xticks(rotation=45)

    plt.tight_layout()
    chart_path = f'public/charts/{country_name.lower().replace(" ", "_")}_charts.png'
    plt.savefig(chart_path)
    plt.close()

    # Préparer les données à renvoyer
    result = {
        "country_name": country_name,
        "country_code": int(country_code),
        "summary": summary_df.to_dict(orient='records'),
        "stats": stats,
        "chart_url": f"/charts/{country_name.lower().replace(' ', '_')}_charts.png",
        "chart_data": {
            "years": years.tolist(),
            "production": production.tolist(),
            "yield": yield_data.tolist()
        }
    }

    return result

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Veuillez fournir le nom du pays comme argument"}))
        sys.exit(1)

    country_name = sys.argv[1]
    result = display_country_stats(country_name)
    print(json.dumps(result))