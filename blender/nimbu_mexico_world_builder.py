import bpy
import importlib.util
import json
import math
import os
import random
import sys
from mathutils import Vector


ROOT = "/Users/rehaanr/Documents/openai"
BLENDER_DIR = os.path.join(ROOT, "blender")
OUTPUT_DIR = os.path.join(BLENDER_DIR, "output")
BLEND_PATH = os.path.join(BLENDER_DIR, "nimbu_mexico_world.blend")
GLB_PATH = os.path.join(ROOT, "public", "assets", "nimbu_mexico_world.glb")
REPORT_PATH = os.path.join(OUTPUT_DIR, "nimbu_mexico_world_report.json")


def load_module(name, filename):
    spec = importlib.util.spec_from_file_location(name, os.path.join(BLENDER_DIR, filename))
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


# Reuse the proven road, terrain, character and bicycle geometry contracts.
# The authored Mexico geometry below remains the source of truth for this GLB.
japan = load_module("nimbu_mexico_shared_helpers", "nimbu_japan_world_builder.py")
base = japan.base
grand = japan.grand
random.seed(20260720)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(os.path.dirname(GLB_PATH), exist_ok=True)

MATS = base.MATS
MATS.update({
    "grass": base.material("Mexico warm grass", (0.48, 0.64, 0.29, 1)),
    "grass_dark": base.material("Mexico agave green", (0.18, 0.40, 0.28, 1)),
    "grass_light": base.material("Mexico garden green", (0.66, 0.75, 0.33, 1)),
    "grand_grass_light": base.material("Mexico grass sunlight", (0.60, 0.71, 0.31, 1)),
    "grand_grass_dark": base.material("Mexico grass shade", (0.36, 0.52, 0.25, 1)),
    "road": base.material("Mexico charcoal road", (0.31, 0.34, 0.34, 1)),
    "road_light": base.material("Mexico cobbled street", (0.57, 0.51, 0.43, 1)),
    "stone": base.material("Mexico volcanic stone", (0.31, 0.29, 0.28, 1)),
    "stone_light": base.material("Mexico limestone", (0.83, 0.74, 0.58, 1)),
    "earth": base.material("Mexico red earth", (0.52, 0.28, 0.17, 1)),
    "earth_light": base.material("Mexico sandy path", (0.79, 0.60, 0.33, 1)),
    "wood": base.material("Mexico dark wood", (0.35, 0.18, 0.09, 1)),
    "coral": base.material("Mexico coral stucco", (0.91, 0.31, 0.22, 1)),
    "pink": base.material("Mexico bougainvillea", (0.88, 0.20, 0.45, 1)),
    "cream": base.material("Mexico warm plaster", (0.95, 0.83, 0.58, 1)),
    "white": base.material("Mexico chalk white", (0.97, 0.92, 0.80, 1)),
    "blue": base.material("Mexico cobalt blue", (0.12, 0.43, 0.70, 1)),
    "teal": base.material("Mexico turquoise", (0.08, 0.62, 0.60, 1)),
    "teal_dark": base.material("Mexico deep teal", (0.05, 0.24, 0.25, 1)),
    "yellow": base.material("Mexico marigold", (0.98, 0.65, 0.08, 1)),
    "saffron": base.material("Mexico orange", (0.94, 0.38, 0.08, 1)),
    "purple": base.material("Jacaranda purple", (0.55, 0.31, 0.72, 1)),
    "purple_light": base.material("Jacaranda blossom light", (0.72, 0.52, 0.84, 1)),
    "terracotta": base.material("Terracotta roof", (0.68, 0.23, 0.12, 1)),
    "water": base.material("Mexico canal water", (0.08, 0.62, 0.73, 1), 0.20, 0.03),
    "rail": base.material("Mexico metro rail", (0.11, 0.13, 0.14, 1), 0.34, 0.46),
})
base.MATS = MATS
grand.MATS = MATS
japan.MATS = MATS


DISTRICTS = [
    {
        "root": "CITY_0_PLAZA_NARANJA", "name": "Plaza Naranja", "center": (-252, -82),
        "labels": ["METRO_NARANJA", "CAFE_LUCERO", "PANADERIA", "CASA_AZUL", "HOSTAL_SOL", "LIBRERIA"],
    },
    {
        "root": "CITY_1_MERCADO_SOL", "name": "Mercado del Sol", "center": (-154, -37),
        "labels": ["TAQUERIA", "FRUTERIA", "MERCADO", "JUGOS", "ARTESANIAS", "CHOCOLATERIA", "FARMACIA_SOL"],
    },
    {
        "root": "CITY_2_CANAL_FLORES", "name": "Canal de Flores", "center": (-42, 27),
        "labels": ["CASA_DEL_CANAL", "EMBARCADERO", "CAFE_FLOR", "TALLER", "HELADERIA", "MUSEO_LOCAL"],
    },
    {
        "root": "CITY_3_BARRIO_AZUL", "name": "Barrio Azul", "center": (78, -35),
        "labels": ["CLINICA_AZUL", "ESCUELA", "TIENDA_BARRIO", "LAVANDERIA", "COMEDOR", "CORREOS"],
    },
    {
        "root": "CITY_4_CERRO_AGAVE", "name": "Cerro Agave", "center": (176, 45),
        "labels": ["CASA_AGAVE", "MIRADOR_CAFE", "TALLER_TEXTIL", "CAPILLA", "POSADA", "TIENDA_CERRO"],
    },
    {
        "root": "CITY_5_MIRADOR_COBRE", "name": "Mirador Cobre", "center": (258, 105),
        "labels": ["ESTACION_COBRE", "HOTEL_MIRADOR", "CAFE_NUBE", "MERCADO_COBRE", "CASA_ROJA", "CENTRO_VISITANTES"],
    },
]
japan.DISTRICTS = DISTRICTS

terrain_height = grand.terrain_height
base.terrain_height = terrain_height
grand.terrain_height = terrain_height
japan.terrain_height = terrain_height


def create_mexican_building(parent, collection, label, x, y, index, obstacle_specs):
    width = 7.8 + (index % 2) * 1.35
    depth = 5.8 + (index % 3) * 0.55
    floors = 2 if index % 3 else 3
    height = floors * 2.35
    root = base.empty(f"OBSTACLE_{label}", (x, y, terrain_height(x, y)), parent, collection)
    root["obstacle"] = True
    root["building_style"] = "mexican_colorful_stucco"
    wall_name = ("coral", "yellow", "blue", "teal", "pink", "cream")[index % 6]
    accent_name = ("teal_dark", "white", "yellow", "terracotta")[index % 4]
    base.box(root, f"{label}_stucco_body", (0, 0, height / 2), (width, depth, height), MATS[wall_name], 0.14)
    base.box(root, f"{label}_stone_base", (0, 0, 0.24), (width + 0.4, depth + 0.4, 0.48), MATS["stone_light"], 0.08)
    base.box(root, f"{label}_flat_roof", (0, 0, height + 0.18), (width + 0.5, depth + 0.5, 0.36), MATS["terracotta"], 0.08)
    front_y = -depth * 0.51
    for side in (-1, 1):
        base.box(root, f"{label}_parapet_{side}", (side * (width * 0.5 - 0.15), 0, height + 0.65), (0.26, depth + 0.3, 1.15), MATS[accent_name], 0.05)
    base.box(root, f"{label}_door", (0, front_y - 0.11, 1.12), (1.35, 0.20, 2.22), MATS["wood"], 0.20)
    base.box(root, f"{label}_awning", (0, front_y - 0.58, 2.45), (3.8, 1.0, 0.20), MATS[accent_name], 0.06, (0.10, 0, 0))
    for floor in range(floors):
        for side in (-1, 1):
            window_y = 1.45 + floor * 2.2
            base.box(root, f"{label}_window_{floor}_{side}", (side * width * 0.28, front_y - 0.12, window_y), (1.15, 0.17, 1.10), MATS["teal_dark"], 0.08)
            base.box(root, f"{label}_window_frame_{floor}_{side}", (side * width * 0.28, front_y - 0.22, window_y), (1.40, 0.08, 1.36), MATS["white"], 0.04)
    if floors > 1:
        base.box(root, f"{label}_balcony", (0, front_y - 0.75, 3.75), (width * 0.72, 1.18, 0.22), MATS["stone_light"], 0.05)
        for post in range(-3, 4):
            base.box(root, f"{label}_balcony_rail_{post}", (post * width * 0.095, front_y - 1.15, 4.25), (0.10, 0.10, 0.85), MATS["teal_dark"], 0.02)
    readable = label.replace("_", " ")
    board_width = min(5.9, width * 0.78)
    base.box(root, f"{label}_name_board", (0, front_y - 0.35, 2.78), (board_width, 0.18, 0.60), MATS["teal_dark"], 0.05)
    base.text_mesh(root, f"{label}_name_text", readable, (0, front_y - 0.47, 2.79), min(0.27, 4.2 / max(9, len(readable))), MATS["white"])
    # Roof plants and water tanks break up otherwise boxy silhouettes.
    if index % 2 == 0:
        base.cylinder(root, f"{label}_water_tank", (width * 0.27, 0.4, height + 1.0), 0.72, 1.35, MATS["teal_dark"], 12)
    else:
        base.ico(root, f"{label}_bougainvillea", (-width * 0.32, front_y - 0.45, height * 0.62), 0.85, MATS["pink"], 1, (1.1, 0.55, 1.3))
    obstacle_specs.append((root.name, Vector((x, y)), max(width, depth) * 0.58))
    return root


def create_district(parent, collection, district, obstacle_specs, protected_paths, roadside_specs):
    cx, cy = district["center"]
    root = base.empty(district["root"], (0, 0, 0), parent, collection)
    root["district_name"] = district["name"]
    root["country"] = "Mexico"
    for index, label in enumerate(district["labels"]):
        x, y = japan.find_clear_japan_building_position((cx, cy), index, 5.1, protected_paths, obstacle_specs)
        create_mexican_building(root, collection, label, x, y, index, obstacle_specs)

    sx, sy, angle, _ = grand.find_roadside_position(
        (cx - 4, cy - 3), 2.8, protected_paths, obstacle_specs=obstacle_specs, roadside_specs=roadside_specs
    )
    sign = base.empty(f"SIGN_{district['root']}", (sx, sy, terrain_height(sx, sy)), root, collection)
    sign.rotation_euler[2] = angle
    sign["hindi"] = district["name"]
    sign["english"] = district["name"]
    sign["prompt"] = "Read the Spanish place sign"
    base.box(sign, f"{district['root']}_sign_board", (0, 0, 2.0), (6.0, 0.32, 1.8), MATS["terracotta"], 0.10)
    base.text_mesh(sign, f"{district['root']}_sign_text", district["name"].upper(), (0, -0.23, 2.02), min(0.27, 4.7 / max(10, len(district["name"]))), MATS["white"])
    for side in (-1, 1):
        base.box(sign, f"{district['root']}_sign_post_{side}", (side * 2.25, 0, 0.9), (0.22, 0.22, 1.8), MATS["wood"], 0.03)
    grand.mark_roadside(sign, 2.8, protected_paths, roadside_specs, "district_sign")


def create_person(parent, name, style_index):
    visual = grand.create_stylized_person(parent, name, style_index)
    if style_index % 3 == 0:
        base.box(visual, f"{name}_serape", (0, -0.38, 1.62), (0.68, 0.10, 0.92), MATS[("yellow", "coral", "teal")[style_index % 3]], 0.04)
    elif style_index % 3 == 1:
        base.cylinder(visual, f"{name}_hat_brim", (0, 0, 2.77), 0.60, 0.10, MATS["cream"], 16)
        base.cylinder(visual, f"{name}_hat_crown", (0, 0, 2.98), 0.30, 0.38, MATS["cream"], 12)
    else:
        base.box(visual, f"{name}_shoulder_bag", (-0.43, 0.18, 1.30), (0.42, 0.28, 0.55), MATS["wood"], 0.08)
    return visual


def create_interactions(parent, collection, protected_paths, obstacle_specs, roadside_specs):
    definitions = [
        ("INTERACT_LOCAL_FRIEND", (-248, -69), "Practise a polite greeting", "practice_greeting", "¡Hola! Mucho gusto.", "Hello! Nice to meet you.", "Lucia"),
        ("INTERACT_CHAI_VENDOR", (-150, -49), "Practise ordering food", "practice_food", "Buenas tardes. ¿Que va a ordenar?", "Good afternoon. What would you like to order?", "Mateo"),
        ("INTERACT_FRUIT_VENDOR", (-137, -24), "Practise shopping at the market", "practice_shop", "Buenos dias. ¿Que busca?", "Good morning. What are you looking for?", "Sofia"),
        ("INTERACT_DIRECTIONS_LOCAL", (-24, 20), "Practise asking for directions", "practice_directions", "Claro, ¿adonde quiere ir?", "Of course. Where would you like to go?", "Diego"),
        ("INTERACT_PHARMACIST", (64, -47), "Practise speaking at a pharmacy", "practice_pharmacy", "Buenas tardes. ¿Que le pasa?", "Good afternoon. What is the matter?", "Ana"),
        ("INTERACT_TICKET_CLERK", (-259, -72), "Practise buying a metro ticket", "practice_train", "¿A que estacion viaja?", "Which station are you travelling to?", "Elena"),
        ("INTERACT_CANAL_GUIDE", (-45, 48), "Talk to the canal guide", "ambient_talk", "Las barcas salen cada veinte minutos.", "The boats leave every twenty minutes.", "Rafa"),
        ("INTERACT_MIRADOR_HOST", (257, 98), "Talk to the mirador host", "ambient_talk", "Desde aqui se ve todo el valle.", "You can see the whole valley from here.", "Carmen"),
    ]
    for index, (name, desired, prompt, action, native, english, speaker) in enumerate(definitions):
        x, y, angle, _ = grand.find_roadside_position(
            desired, 0.72, protected_paths, -1 if index % 2 else 1, obstacle_specs, roadside_specs
        )
        item = base.empty(name, (x, y, terrain_height(x, y)), parent, collection)
        item.rotation_euler[2] = angle
        item["prompt"] = prompt
        item["action"] = action
        item["dialogue_hi"] = native
        item["dialogue_en"] = english
        item["speaker_name"] = speaker
        item["lesson_target"] = action.startswith("practice_")
        create_person(item, name.replace("INTERACT_", "NPC_"), index)
        grand.mark_roadside(item, 0.72, protected_paths, roadside_specs, "interaction")

    ambient_positions = [(-225, -102), (-176, -56), (-118, -17), (-55, 48), (21, -70), (92, -47), (147, 30), (205, 70), (276, 118)]
    ambient_phrases = [
        ("Buenos dias.", "Good morning."),
        ("Que tenga buen dia.", "Have a good day."),
        ("Con permiso.", "Excuse me."),
    ]
    for index, desired in enumerate(ambient_positions):
        x, y, angle, _ = grand.find_roadside_position(
            desired, 0.72, protected_paths, -1 if index % 2 else 1, obstacle_specs, roadside_specs
        )
        npc = base.empty(f"NPC_ROUTINE_{index:02d}", (x, y, terrain_height(x, y)), parent, collection)
        npc.rotation_euler[2] = angle
        npc["routine_radius"] = 3.5 + index % 4
        npc["routine_speed"] = 0.45 + (index % 3) * 0.10
        native, english = ambient_phrases[index % len(ambient_phrases)]
        npc["dialogue_hi"] = native
        npc["dialogue_en"] = english
        create_person(npc, f"MX_LOCAL_{index:02d}", index + 3)
        grand.mark_roadside(npc, 0.72, protected_paths, roadside_specs, "npc_routine")


def create_metro(parent, collection):
    controls = [
        (-289, -116), (-292, -92), (-291, -58), (-286, -18), (-278, 24),
        (-266, 62), (-244, 96), (-210, 119), (-164, 132), (-112, 136),
        (-58, 132), (-4, 126), (48, 131), (101, 139), (151, 138),
        (194, 134), (224, 128), (247, 120), (265, 111),
    ]
    path = base.sample_path(controls, 14)
    corridor = base.empty("MEXICO_METRO_CORRIDOR", (0, 0, 0), parent, collection)
    corridor["transport_type"] = "metro"
    base.create_ribbon(corridor, "METRO_BALLAST", path, 3.7, MATS["stone"], collection, 0.30, False)
    for side in (-1, 1):
        base.create_ribbon(corridor, f"METRO_RAIL_{side}", base.offset_path(path, side * 1.02), 0.18, MATS["rail"], collection, 0.48, False)
    for index in range(0, len(path), 4):
        point = Vector(path[index])
        previous = Vector(path[max(0, index - 1)])
        following = Vector(path[min(len(path) - 1, index + 1)])
        angle = math.atan2((following - previous).y, (following - previous).x)
        base.box(corridor, f"BATCH_METRO_SLEEPER_{index:03d}", (point.x, point.y, terrain_height(point.x, point.y) + 0.36), (0.34, 2.9, 0.16), MATS["wood"], 0.02, (0, 0, angle))
    grand.add_route_markers(parent, collection, "TRAIN_ROUTE", controls)

    train = base.empty("TOY_TRAIN", (controls[0][0], controls[0][1], terrain_height(*controls[0]) + 1.0), parent, collection)
    train["speed_mps"] = 21.0
    train["vehicle_name"] = "Metro Naranja"
    train["transport_type"] = "metro"
    for car_index in range(5):
        car = base.empty(f"Train_car_{car_index}", (-car_index * 5.5, 0, 0), train, collection)
        base.box(car, f"Train_car_body_{car_index}", (0, 0, 1.42), (5.0, 2.42, 2.35), MATS["white"], 0.22)
        base.box(car, f"Train_orange_stripe_{car_index}", (0, -1.23, 1.40), (4.72, 0.10, 0.46), MATS["saffron"], 0.02)
        base.box(car, f"Train_car_roof_{car_index}", (0, 0, 2.69), (5.08, 2.50, 0.28), MATS["teal_dark"], 0.10)
        for window_index in (-1.55, 0, 1.55):
            base.box(car, f"Train_window_{car_index}_{window_index}", (window_index, -1.25, 1.98), (1.12, 0.10, 0.70), MATS["blue"], 0.03)
        for side in (-1, 1):
            for axle in (-1.6, 1.6):
                base.cylinder(car, f"Train_wheel_{car_index}_{side}_{axle}", (axle, side * 1.12, 0.34), 0.44, 0.22, MATS["rail"], 12, (math.radians(90), 0, 0))
    base.empty("TRAIN_PLAYER_SEAT", (-5.5, 0, 1.30), train, collection)["vehicle_seat"] = True
    base.empty("TRAIN_EXIT_POINT", (-5.5, -2.25, 0.20), train, collection)["vehicle_exit"] = True

    stops = [
        ((-289, -105), "Plaza Naranja", (-252, -82)),
        ((-273, 48), "Parque Jacaranda", (-240, 30)),
        ((-77, 134), "Canal de Flores", (-45, 58)),
        ((151, 138), "Cerro Agave", (176, 70)),
        ((258, 115), "Mirador Cobre", (258, 105)),
    ]
    links = {}
    for index, ((x, y), name, (link_x, link_y)) in enumerate(stops):
        stop = base.empty(f"TRAIN_STOP_{index:02d}", (x, y, terrain_height(x, y) + 0.18), parent, collection)
        stop["stop_name"] = name
        stop["announcement_hi"] = f"Proxima estacion: {name}"
        base.box(stop, f"Metro_platform_{index}", (0, -4.0, 0.25), (19, 4.2, 0.50), MATS["stone_light"], 0.08)
        base.box(stop, f"Metro_canopy_{index}", (0, -4.2, 3.1), (12.0, 3.3, 0.28), MATS["saffron"], 0.10)
        for side in (-4.5, 4.5):
            base.box(stop, f"Metro_canopy_post_{index}_{side}", (side, -4.2, 1.55), (0.22, 0.22, 3.1), MATS["teal_dark"], 0.03)
        zone = base.empty(f"TRAIN_BOARDING_ZONE_{index:02d}", (0, -3.8, 0.55), stop, collection)
        zone["boarding_zone"] = True
        base.box(zone, f"Boarding_zone_mark_{index}", (0, 0, 0), (7.5, 0.26, 0.05), MATS["yellow"], 0.02)
        sign = base.empty(f"SIGN_TRAIN_STOP_{index:02d}", (0, -5.5, 0), stop, collection)
        sign["hindi"] = name
        sign["english"] = name
        sign["prompt"] = "Read the metro station sign"
        base.box(sign, f"Station_sign_board_{index}", (0, 0, 2.0), (6.6, 0.28, 1.6), MATS["terracotta"], 0.07)
        base.text_mesh(sign, f"Station_sign_english_{index}", name.upper(), (0, -0.20, 2.0), min(0.29, 4.9 / max(10, len(name))), MATS["white"])
        link = base.sample_path([(x, y - 5), ((x + link_x) * 0.5, (y + link_y) * 0.5), (link_x, link_y)], 9)
        base.create_ribbon(parent, f"WALKABLE_STATION_LINK_{index:02d}", link, 2.8, MATS["stone_light"], collection, 0.15)
        links[f"station_link_{index}"] = link
    return path, links


def create_landmarks(parent, collection, protected_paths):
    canal = base.empty("LANDMARK_CANAL_DE_FLORES", (-39, 31, terrain_height(-39, 31)), parent, collection)
    base.ico(canal, "SCENERY_MEXICO_CANAL_WATER", (0, 0, 0.18), 1, MATS["water"], 2, (24, 16, 0.20))
    bridge_path = base.sample_path([(-66, 30), (-57, 31), (-48, 31), (-42, 31)], 4)
    base.create_ribbon(parent, "WALKABLE_MEXICO_CANAL_BRIDGE", bridge_path, 2.8, MATS["terracotta"], collection, 0.54)
    for boat_index, (bx, by, color) in enumerate(((-48, 27, "yellow"), (-34, 37, "pink"), (-27, 24, "teal"))):
        boat = base.empty(f"SCENERY_TRAJINERA_{boat_index}", (bx, by, terrain_height(-39, 31) + 0.35), canal, collection)
        base.box(boat, f"Trajinera_hull_{boat_index}", (0, 0, 0), (4.2, 1.45, 0.45), MATS[color], 0.14)
        base.box(boat, f"Trajinera_roof_{boat_index}", (0, 0, 1.55), (3.6, 1.7, 0.18), MATS[("coral", "yellow", "blue")[boat_index]], 0.08)
        for side in (-1, 1):
            base.box(boat, f"Trajinera_post_{boat_index}_{side}", (side * 1.45, 0, 0.82), (0.12, 0.12, 1.45), MATS["wood"], 0.02)

    plaza = base.empty("LANDMARK_MERCADO_ZOCALO", (-151, -38, terrain_height(-151, -38)), parent, collection)
    base.cylinder(plaza, "Zocalo_fountain_basin", (0, 0, 0.34), 3.2, 0.68, MATS["stone_light"], 18)
    base.cylinder(plaza, "Zocalo_fountain_column", (0, 0, 1.45), 0.48, 2.5, MATS["white"], 14)
    base.ico(plaza, "Zocalo_fountain_water", (0, 0, 0.72), 1, MATS["water"], 2, (2.65, 2.65, 0.18))
    flags = base.empty("LANDMARK_PAPEL_PICADO", (0, 0, 0), parent, collection)
    for line_index, (x, y) in enumerate(((-160, -38), (-150, -32), (-141, -43))):
        for flag_index in range(9):
            base.box(flags, f"Papel_flag_{line_index}_{flag_index}", (x + (flag_index - 4) * 1.55, y, terrain_height(x, y) + 5.2 + math.sin(flag_index) * 0.18), (0.90, 0.08, 0.72), MATS[("pink", "yellow", "teal", "coral", "blue")[flag_index % 5]], 0.02)

    agaves = base.empty("LANDMARK_CERRO_AGAVE_FIELDS", (0, 0, 0), parent, collection)
    route_points = [Vector(point) for path in protected_paths.values() for point in path]
    made = 0
    attempts = 0
    while made < 90 and attempts < 1500:
        attempts += 1
        x = random.uniform(75, 225)
        y = random.uniform(-130, -78)
        point = Vector((x, y))
        if min((point - sample).length for sample in route_points) < 6.0:
            continue
        for leaf in range(6):
            angle = leaf * math.tau / 6
            base.ico(agaves, f"BATCH_AGAVE_{made}_{leaf}", (x + math.cos(angle) * 0.35, y + math.sin(angle) * 0.35, terrain_height(x, y) + 0.55), 0.45, MATS["grass_dark"], 1, (0.32, 0.22, 1.45))
        made += 1

    volcano = base.empty("BACKGROUND_MEXICO_VOLCANO", (225, 170, terrain_height(225, 150)), parent, collection)
    base.ico(volcano, "BACKGROUND_VOLCANO_BASE", (0, 0, 25), 1, MATS["stone"], 2, (55, 25, 48))
    base.ico(volcano, "BACKGROUND_VOLCANO_SNOW", (0, 0, 48), 1, MATS["white"], 2, (18, 9, 11))


def create_scenery(parent, collection, protected_paths, obstacle_specs):
    route_points = [Vector(point) for path in protected_paths.values() for point in path]
    obstacle_centers = [(center, radius) for _, center, radius in obstacle_specs]
    trees = base.empty("SCENERY_MEXICO_TREES", (0, 0, 0), parent, collection)
    created = 0
    attempts = 0
    while created < 165 and attempts < 4200:
        attempts += 1
        x, y = random.uniform(-290, 290), random.uniform(-141, 141)
        point = Vector((x, y))
        if min((point - sample).length for sample in route_points) < 7.2:
            continue
        if any((point - center).length < radius + 4.4 for center, radius in obstacle_centers):
            continue
        if ((x + 39) / 28) ** 2 + ((y - 31) / 20) ** 2 < 1.25:
            continue
        scale = random.uniform(0.8, 1.35)
        ground = terrain_height(x, y)
        tree = base.empty(f"SCENERY_MX_TREE_{created:03d}", (x, y, ground), trees, collection)
        base.cylinder(tree, f"BATCH_MX_TRUNK_{created:03d}", (0, 0, 1.55 * scale), 0.26 * scale, 3.1 * scale, MATS["wood"], 8)
        if created % 5 == 0:
            for leaf in range(6):
                angle = leaf * math.tau / 6
                base.ico(tree, f"BATCH_MX_PALM_{created}_{leaf}", (math.cos(angle) * 0.65, math.sin(angle) * 0.65, 4.0 * scale), 0.65 * scale, MATS["grass_dark"], 1, (1.9, 0.45, 0.38))
        else:
            canopy = base.ico(tree, f"BATCH_MX_JACARANDA_{created:03d}", (0, 0, 3.7 * scale), 1.5 * scale, MATS[("purple", "purple_light", "pink")[created % 3]], 1, (1.15, 0.92, 1.02))
            canopy["wind_phase"] = created * 0.27
        created += 1

    west = base.empty("BACKGROUND_MEXICO_WEST_CITY", (0, 0, 0), parent, collection)
    for index, y in enumerate(range(-145, 151, 18)):
        height = 10 + index % 4 * 2.5
        base.box(west, f"BATCH_MX_WEST_CITY_{index:02d}", (-307, y, height / 2 - 1), (12, 14, height), MATS[("coral", "yellow", "blue", "teal")[index % 4]], 0.18)
    east = base.empty("BACKGROUND_MEXICO_EAST_CANYON", (0, 0, 0), parent, collection)
    for index, y in enumerate(range(-150, 151, 20)):
        height = 17 + (index * 5) % 14
        base.ico(east, f"BACKGROUND_MX_CANYON_{index:02d}", (309, y, terrain_height(300, y) + height * 0.38), 1, MATS[("earth", "terracotta", "stone")[index % 3]], 2, (13, 14, height))
    north = base.empty("BACKGROUND_MEXICO_NORTH_SIERRA", (0, 0, 0), parent, collection)
    for index, x in enumerate(range(-292, 293, 24)):
        height = 12 + (index * 7) % 13
        base.ico(north, f"BACKGROUND_MX_SIERRA_{index:02d}", (x, 159, terrain_height(x, 150) + height * 0.40), 1, MATS[("earth_light", "grass_dark", "stone")[index % 3]], 2, (14, 10, height))
    south = base.empty("BACKGROUND_MEXICO_SOUTH_GARDENS", (0, 0, 0), parent, collection)
    for index, x in enumerate(range(-290, 291, 24)):
        z = terrain_height(x, -150)
        base.box(south, f"BATCH_MX_SOUTH_WALL_{index:03d}", (x, -155, z - 2.8), (25, 12, 6.0), MATS[("terracotta", "stone_light")[index % 2]], 0.12)
        base.box(south, f"BATCH_MX_SOUTH_TOP_{index:03d}", (x, -151, z + 0.25), (25, 7, 0.45), MATS["grass"], 0.08)


def create_character(parent, collection):
    player = base.create_character(parent, collection)
    x, y = -272.0, -103.0
    player.location = (x, y, terrain_height(x, y) + 0.08)
    player["spawn_heading_x"] = 0.88
    player["spawn_heading_z"] = -0.47
    player["traveller_world"] = "spanish"
    return player


def validate(protected_paths, obstacle_specs, roadside_specs):
    blocked = []
    all_points = [Vector(point) for path in protected_paths.values() for point in path]
    for name, center, radius in obstacle_specs:
        clearance = min((center - point).length for point in all_points) - radius
        if clearance < 2.25:
            blocked.append(name)
    for name, center, radius, clearance, _ in roadside_specs:
        if clearance < grand.ROADSIDE_CLEARANCE - 0.01:
            blocked.append(name)
    walkables = [obj.name for obj in bpy.data.objects if obj.name.startswith("WALKABLE_")]
    terrain_samples = [
        terrain_height(x, y)
        for x in range(-300, 301, 30)
        for y in range(-150, 151, 30)
    ]
    playable_elevation_span = max(terrain_samples) - min(terrain_samples)
    if playable_elevation_span > 0.001:
        blocked.append("PLAYABLE_GROUND_NOT_LEVEL")
    report = {
        "clear": not blocked,
        "blocked": blocked,
        "world_id": "spanish",
        "country": "Mexico",
        "map_dimensions_m": [600, 300],
        "playable_ground_mode": "level",
        "playable_ground_z_m": grand.PLAYABLE_GROUND_Z,
        "playable_elevation_span_m": round(playable_elevation_span, 6),
        "district_count": len(DISTRICTS),
        "districts": [item["name"] for item in DISTRICTS],
        "walkable_count": len(walkables),
        "obstacle_count": len(obstacle_specs),
        "lesson_target_count": 6,
        "npc_routine_count": 9,
        "metro_stop_count": 5,
        "bicycle_count": len([obj for obj in bpy.data.objects if obj.name == "BICYCLE" or obj.name.startswith("BICYCLE_DISTRICT_")]),
        "transport_modes": ["walking", "bicycle", "metro"],
        "minimum_roadside_clearance_m": round(min(item[3] for item in roadside_specs), 3),
    }
    with open(REPORT_PATH, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2, ensure_ascii=False)
    print("NIMBU_MEXICO_LAYOUT", json.dumps(report, ensure_ascii=False))
    if blocked:
        raise RuntimeError("Mexico protected corridors blocked by: " + ", ".join(blocked))
    return report


def build():
    base.clear_scene()
    export = base.make_collection("EXPORT_NIMBU_MEXICO_WORLD")
    root = base.empty("WORLD_NIMBU_MEXICO", collection=export)
    root["world_id"] = "spanish"
    root["country"] = "Mexico"
    root["world_style"] = "colorful_low_poly_mexico"
    root["playable_ground_mode"] = "level"
    root["playable_ground_z_m"] = grand.PLAYABLE_GROUND_Z
    root["map_width_m"] = 600
    root["map_depth_m"] = 300
    root["district_count"] = 6
    root["transport_modes"] = "walking,bicycle,metro"

    grand.create_terrain(root, export)
    protected_paths, _ = grand.create_road_network(root, export)
    road_root = bpy.data.objects.get("INDIA_VEHICLE_ROAD_NETWORK")
    if road_root:
        road_root.name = "MEXICO_STREET_AND_WALKING_NETWORK"
    metro_path, station_links = create_metro(root, export)
    protected_paths["rail"] = metro_path
    protected_paths.update(station_links)
    obstacle_specs = []
    roadside_specs = []
    for district in DISTRICTS:
        create_district(root, export, district, obstacle_specs, protected_paths, roadside_specs)
    create_interactions(root, export, protected_paths, obstacle_specs, roadside_specs)
    create_landmarks(root, export, protected_paths)
    japan.create_bicycles(root, export, protected_paths, obstacle_specs, roadside_specs)
    create_scenery(root, export, protected_paths, obstacle_specs)
    create_character(root, export)
    report = validate(protected_paths, obstacle_specs, roadside_specs)

    grand.configure_render(export)
    cameras = (
        (base.create_camera("CAMERA_MEXICO_GAMEPLAY", (-292, -128, 18), (-245, -75, 2), 52), "nimbu_mexico_gameplay.png"),
        (base.create_camera("CAMERA_MEXICO_OVERVIEW", (-430, -480, 420), (0, 0, 5), 58), "nimbu_mexico_overview.png"),
        (base.create_camera("CAMERA_MEXICO_MARKET", (-205, -112, 52), (-151, -37, 3), 55), "nimbu_mexico_market.png"),
        (base.create_camera("CAMERA_MEXICO_CANAL", (-105, -22, 42), (-39, 31, 2), 54), "nimbu_mexico_canal.png"),
    )
    scene = bpy.context.scene
    if os.environ.get("NIMBU_SKIP_RENDERS") != "1":
        for camera, filename in cameras:
            scene.camera = camera
            scene.render.filepath = os.path.join(OUTPUT_DIR, filename)
            bpy.ops.render.render(write_still=True)

    bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in export.all_objects:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=GLB_PATH,
        export_format="GLB",
        use_selection=True,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
        export_apply=True,
    )
    bpy.ops.object.select_all(action="DESELECT")
    print("NIMBU_MEXICO_COMPLETE", BLEND_PATH, GLB_PATH, json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    build()
