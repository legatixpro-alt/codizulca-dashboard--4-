with open("scripts/raw_survey_complete.csv", "w", encoding="utf-8") as f:
    f.write("Fecha,Vendedor,Cliente,Estado Encuesta,Tipo Cliente,RIF/Cédula,Teléfono,Email,Estado,Municipio,Latitud,Longitud,Notas\n")
print("Reset raw_survey_complete.csv")
