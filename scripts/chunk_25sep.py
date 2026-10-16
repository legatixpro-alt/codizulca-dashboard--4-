# Append chunk of 25/9 and 24/9 surveys
import sys

chunk = """25/9/2026,sairuvalles92@gmail.com,"CREA DESARROLLOS, S.A.",MODIFICADA,Supermercado,J-308460281,,,Zulia,Maracaibo,10.6717562,-71.6512050,"[MODIFICADA - 25/9/2026, 10:48:23 a. m.] Pendiente: Fotos del Lugar"
25/9/2026,hernandj81@gmail.com,"DISTRIBUIDORA MF MCBO, C.A.",COMPLETA,Distribuidor,J-507997707,+58 414-4404760,,Zulia,San Francisco,10.6756578,-71.6270986,"[COMPLETA - 25/9/2026, 9:55:26 a. m.]"
25/9/2026,carlos.fuenmayorrp@gmail.com,"DISTRMAR 2KA, C.A",PENDIENTE,,J-501836809,04246407515,,Zulia,,10.6388954,-71.6374971,"[PENDIENTE - 25/9/2026, 9:52:26 a. m.] Pendiente: Tipo de Negocio, Productos, Municipio, Sector / Urbanización, Dirección Exacta"
25/9/2026,sairuvalles92@gmail.com,"FARMACIA EL CALLEJON, C.A",PENDIENTE,Faramacia,J-502808086,,,Zulia,Maracaibo,10.6623783,-71.6378919,"[PENDIENTE - 25/9/2026, 9:52:07 a. m.] Pendiente: Fotos del Lugar"
25/9/2026,mariabricenosala@gmail.com,"YELITZA DEL CARMEN ARTEAGA CASANOVA",COMPLETA,Abastos y Bodegas,V-141174416,04129571028,,Zulia,San Francisco,10.5257806,-71.6811275,"[COMPLETA - 25/9/2026, 9:50:39 a. m.]"
25/9/2026,maryerygarcia29@gmail.com,"COMERCIAL Y PANADERIA JBS, C.A",COMPLETA,Panadería,J-411348066,0246774172,,Zulia,Cabimas,10.4183490,-71.4505211,"[COMPLETA - 25/9/2026, 9:50:28 a. m.]"
25/9/2026,moremelcobranza@gmail.com,"INVERSIONES VIRGEN DEL CARMEN M&N, C.A",COMPLETA,Abastos y Bodegas,J-405689030,04127898449,,Zulia,Machiques,10.0605298,-72.5329308,"[COMPLETA - 25/9/2026, 9:49:05 a. m.]"
25/9/2026,jh3590055@gmail.com,"DISTRIBUIDORA ATOM, C.A",COMPLETA,Abastos y Bodegas,J-410377011,04146304403,,Zulia,Maracaibo,10.6611071,-71.6037427,"[COMPLETA - 25/9/2026, 9:46:03 a. m.]"
25/9/2026,oscardortizh06@gmail.com,"JAIRO LEONARDO TOYO MALDONADO (BODEGA EL PORCHE 2015, F.C)",COMPLETA,Abastos y Bodegas,V-121779141,+58 424-6507346,,Falcón,Coro,11.4111844,-69.6853998,"[COMPLETA - 25/9/2026, 9:40:05 a. m.]"
25/9/2026,maryerygarcia29@gmail.com,"FRIGORIFICO SUPER 32,C.A",COMPLETA,Minimarket,J-507017958,04126552079,,Zulia,Cabimas,10.4161190,-71.4477315,"[COMPLETA - 25/9/2026, 9:25:12 a. m.]"
25/9/2026,sarahreyesrosales@gmail.com,"COMERCIALIZADORA L & M 2014, C.A",PENDIENTE,Minimarket,J-403283923,04121692007,,Zulia,San Francisco,10.5727758,-71.6598490,"[PENDIENTE - 25/9/2026, 9:08:02 a. m.] Pendiente: Productos"
25/9/2026,carlos.fuenmayorrp@gmail.com,"COMERCIAL Y CHARCUTERIA INVERPRO, C.A",PENDIENTE,Carnicería/Frigorífico,J-405447990,04246583396,,Zulia,,10.6402253,-71.6527934,"[PENDIENTE - 25/9/2026, 9:24:48 a. m.] Pendiente: Productos, Municipio, Sector / Urbanización, Dirección Exacta, Día de Visita, Frecuencia"
25/9/2026,sarahreyesrosales@gmail.com,"CORPORACION DISARCA, C.A.",COMPLETA,Abastos y Bodegas,J-407343017,04125948487,,Zulia,Jesús Enrique Lossada,10.5536477,-71.6693283,""
25/9/2026,mariabricenosala@gmail.com,"SUPERTIENDAS LA 200, C.A",COMPLETA,Mayorista,J-507798577,04146681031,,Zulia,San Francisco,10.5371765,-71.6954489,"[COMPLETA - 25/9/2026, 9:23:22 a. m.]"
25/9/2026,cobranzaslauyleo05@gmail.com,"COMERCIALIZADORA RAMI 2020,C.A",PENDIENTE,Distribuidor,J-500690770,,,Falcón,Coro,11.4055838,-69.6814011,"[PENDIENTE - 25/9/2026, 9:19:53 a. m.] Pendiente: Productos, Sector / Urbanización, Dirección Exacta, Día de Visita"
25/9/2026,jh3590055@gmail.com,"FARMACIA NUEVA VERACRUZ, C.A",COMPLETA,FARMACIAS,J-315073200,04146292513,,ZULIA,MARACAIBO,10.6396960,-71.6099682,"[COMPLETA - 25/9/2026, 9:18:16 a. m.]"
25/9/2026,johnatansoto18@gmail.com,"CONSTRUCTORA AGROPECUARIA CUEVAS, C.A.",COMPLETA,Abastos y Bodegas,J-297278451,+58 412-6424646,,Zulia,Mara,10.3218928,-72.3145015,"[COMPLETA - 25/9/2026, 9:07:17 a. m.]"
25/9/2026,oscardortizh06@gmail.com,"GREGORIO DANIEL LUGO GARCIA",COMPLETA,Abastos y Bodegas,V-187697960,+58 414-6455440,,Falcón,Coro,11.4025565,-69.6855799,"[COMPLETA - 25/9/2026, 9:07:02 a. m.]"
25/9/2026,mariabricenosala@gmail.com,"SUPER SAMAN, C.A",COMPLETA,Supermercado,J-403337195,04246550175,,Zulia,San Francisco,10.5388416,-71.6966341,"[COMPLETA - 25/9/2026, 9:06:50 a. m.]"
25/9/2026,johnatansoto18@gmail.com,"MULTITIENDA NEW MUNDO, C.A",COMPLETA,Supermercado,J-506745771,04146805694,,Zulia,Rosario de Perijá,10.3215586,-72.3136052,"[COMPLETA - 25/9/2026, 8:58:47 a. m.]"
25/9/2026,moremelcobranza@gmail.com,"PANADERIA Y SUPERMERCADO OLIVAS, C.A.",COMPLETA,Panadería,J-403447462,04146054402,,Zulia,Machiques,10.0605923,-72.5361433,"[COMPLETA - 25/9/2026, 8:54:56 a. m.]"
25/9/2026,johnatansoto18@gmail.com,"INVERSIONES MI PEQUEÑA GRISBERT, C.A",COMPLETA,Minimarket,J-504336912,04120316166,,Zulia,Rosario de Perijá,10.3218939,-72.3135277,"[COMPLETA - 25/9/2026, 8:53:24 a. m.]"
25/9/2026,mariabricenosala@gmail.com,"KARINA DEL CARMEN TOUS LAMBRAÑO",COMPLETA,Abastos y Bodegas,V-178354295,04146536580,,Zulia,Maracaibo,10.6037634,-71.6699200,"[COMPLETA - 25/9/2026, 8:44:12 a. m.]"
25/9/2026,johnatansoto18@gmail.com,"GRAN MERCAPOLLO LA VILLA, C.A",COMPLETA,Mayorista,J-316436284,04127804818,,Zulia,Rosario de Perijá,10.3232608,-72.3136078,"[COMPLETA - 25/9/2026, 8:33:36 a. m.]"
25/9/2026,johnatansoto18@gmail.com,"INVERSIONES Y CARNICERIA S&G MARKET, C.A",COMPLETA,Minimarket,J-507260313,04126643513,,Zulia,Rosario de Perijá,10.3225416,-72.3135866,"[COMPLETA - 25/9/2026, 8:28:58 a. m.]"
25/9/2026,johnatansoto18@gmail.com,"MINI MARKET CENTER 2021, C.A",COMPLETA,Minimarket,J-501357617,04149706688,,Zulia,Rosario de Perijá,10.3228321,-72.3117303,"[COMPLETA - 25/9/2026, 8:24:23 a. m.]"
25/9/2026,johnatansoto18@gmail.com,"MULTITIENDAS FARMAK, C.A",COMPLETA,Faramacia,J-507428990,+58 414-1674846,,Zulia,Rosario de Perijá,10.3203096,-72.3112821,"[COMPLETA - 25/9/2026, 8:17:07 a. m.]"
25/9/2026,mariabricenosala@gmail.com,"INVERSIONES JL & RS, C.A",COMPLETA,Panadería,J-500859660,04246966114,,Zulia,Maracaibo,10.6240796,-71.6431307,"[COMPLETA - 25/9/2026, 8:11:12 a. m.]"
25/9/2026,lugoyoleida00@gmail.com,"INVERSORA Y COMERCIALIZADORA P¨SOILA, C. A.",COMPLETA,Minimarket,J-408959976,04124733190,,Zulia,Santa Rita,10.5363341,-71.5189267,"[COMPLETA - 24/9/2026, 8:00:15 p. m.]"
"""

with open("scripts/raw_survey_complete.csv", "a", encoding="utf-8") as f:
    f.write(chunk.strip() + "\n")
print("Appended 25/9 remaining")
