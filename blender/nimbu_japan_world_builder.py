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
BLEND_PATH = os.path.join(BLENDER_DIR, "nimbu_japan_world.blend")
GLB_PATH = os.path.join(ROOT, "public", "assets", "nimbu_japan_world.glb")
REPORT_PATH = os.path.join(OUTPUT_DIR, "nimbu_japan_world_report.json")
TORII_GATE_SOURCE = os.path.join(BLENDER_DIR, "source_assets", "japanese_torii_gate_game_asset.glb")


def load_module(name, filename):
    spec = importlib.util.spec_from_file_location(name, os.path.join(BLENDER_DIR, filename))
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


base = load_module("nimbu_japan_base", "nimbu_diorama_v1_builder.py")
grand = load_module("nimbu_japan_grand_helpers", "nimbu_grand_world_builder.py")
random.seed(20260722)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(os.path.dirname(GLB_PATH), exist_ok=True)

MATS = base.MATS
MATS.update({
    "grass": base.material("Japan moss green", (0.39, 0.60, 0.31, 1)),
    "grass_dark": base.material("Japan cedar green", (0.18, 0.38, 0.25, 1)),
    "grass_light": base.material("Japan rice green", (0.58, 0.72, 0.37, 1)),
    "grand_grass_light": base.material("Japan grass sunlight", (0.53, 0.69, 0.36, 1)),
    "grand_grass_dark": base.material("Japan grass shadow", (0.30, 0.49, 0.26, 1)),
    "road": base.material("Japan blue asphalt", (0.34, 0.42, 0.46, 1)),
    "road_light": base.material("Japan lane asphalt", (0.48, 0.54, 0.55, 1)),
    "stone": base.material("Japan dark stone", (0.39, 0.43, 0.43, 1)),
    "stone_light": base.material("Japan pavement", (0.79, 0.78, 0.69, 1)),
    "earth": base.material("Japan soil", (0.43, 0.34, 0.24, 1)),
    "earth_light": base.material("Japan path", (0.72, 0.61, 0.43, 1)),
    "wood": base.material("Japan cedar wood", (0.34, 0.19, 0.12, 1)),
    "coral": base.material("Torii vermilion", (0.77, 0.12, 0.08, 1)),
    "pink": base.material("Sakura pink", (0.95, 0.55, 0.66, 1)),
    "sakura_light": base.material("Sakura petal light", (1.00, 0.76, 0.82, 1)),
    "sakura_deep": base.material("Sakura petal deep", (0.88, 0.34, 0.53, 1)),
    "cream": base.material("Washi cream", (0.93, 0.90, 0.78, 1)),
    "white": base.material("Japan clean white", (0.96, 0.97, 0.93, 1)),
    "blue": base.material("Metro blue", (0.18, 0.50, 0.65, 1)),
    "teal": base.material("Japan shop teal", (0.18, 0.58, 0.55, 1)),
    "teal_dark": base.material("Japan sign navy", (0.08, 0.21, 0.27, 1)),
    "yellow": base.material("Lantern gold", (0.96, 0.68, 0.18, 1)),
    "saffron": base.material("Temple orange", (0.92, 0.35, 0.11, 1)),
    "water": base.material("Japan river", (0.20, 0.66, 0.73, 1), 0.22, 0.04),
    "rail": base.material("Metro rail", (0.11, 0.14, 0.16, 1), 0.38, 0.42),
})
grand.MATS = MATS
base.MATS = MATS


DISTRICTS = [
    {
        "root": "CITY_0_SAKURA_GATE",
        "name": "Sakura Gate",
        "center": (-252, -82),
        "kind": "modern",
        "labels": ["SAKURA_STATION", "FAMILY_MART", "KISSATEN_CAFE", "CAPSULE_HOTEL", "BOOK_OFF", "BENTO_SHOP"],
    },
    {
        "root": "CITY_1_KONBINI_STREET",
        "name": "Konbini Street",
        "center": (-154, -37),
        "kind": "modern",
        "labels": ["RAMEN_YOKOCHO", "KONBINI_24H", "ARCADE", "MANGA_CAFE", "DRUG_STORE", "TAIYAKI_STAND", "KARAOKE"],
    },
    {
        "root": "CITY_2_KAWA_MARKET",
        "name": "Kawa Market",
        "center": (-42, 27),
        "kind": "mixed",
        "labels": ["FISH_MARKET", "RIVER_CAFE", "CERAMIC_SHOP", "SENTO_BATH", "TEA_HOUSE", "BIKE_REPAIR"],
    },
    {
        "root": "CITY_3_MIDORI_VILLAGE",
        "name": "Midori Village",
        "center": (78, -35),
        "kind": "country",
        "labels": ["VILLAGE_CLINIC", "RICE_COOP", "SOBA_HOUSE", "POST_OFFICE", "MINKA_STAY", "FARM_SHOP"],
    },
    {
        "root": "CITY_4_INARI_HILL",
        "name": "Inari Hill",
        "center": (176, 45),
        "kind": "traditional",
        "labels": ["SHRINE_OFFICE", "OMAMORI_SHOP", "MATCHA_HOUSE", "CALLIGRAPHY", "RYOKAN", "TEMPLE_KITCHEN"],
    },
    {
        "root": "CITY_5_YAMA_ONSEN",
        "name": "Yama Onsen",
        "center": (258, 105),
        "kind": "traditional",
        "labels": ["ONSEN_STATION", "MOUNTAIN_RYOKAN", "NOODLE_HOUSE", "ONSEN_BATH", "HIKING_POST", "VIEW_TEA_ROOM"],
    },
]


terrain_height = grand.terrain_height
base.terrain_height = terrain_height
grand.terrain_height = terrain_height


def import_torii_gate_template(collection):
    """Import the attributed torii once; later gates share its mesh/material data."""
    if not os.path.exists(TORII_GATE_SOURCE):
        raise FileNotFoundError(f"Missing torii source asset: {TORII_GATE_SOURCE}")
    existing = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=TORII_GATE_SOURCE)
    imported = [obj for obj in bpy.data.objects if obj not in existing]
    template = next((obj for obj in imported if obj.name == "Sketchfab_model"), None)
    if template is None:
        raise RuntimeError("The torii GLB no longer contains its expected Sketchfab_model root")
    keep = {template, *template.children_recursive}
    for obj in imported:
        if obj not in keep:
            bpy.data.objects.remove(obj, do_unlink=True)
    for obj in keep:
        base.move_to_collection(obj, collection)
    template.name = "TORII_GATE_SOURCE_VISUAL"
    return template


def linked_hierarchy_copy(source, parent, collection, suffix):
    """Copy an imported hierarchy while sharing heavy mesh and texture data."""
    clone = source.copy()
    if getattr(source, "data", None) is not None:
        clone.data = source.data
    clone.name = f"Torii_asset_{suffix}_{source.name}"
    collection.objects.link(clone)
    clone.parent = parent
    for child in source.children:
        linked_hierarchy_copy(child, clone, collection, suffix)
    return clone


def gable_roof(parent, name, position, size, material, collection):
    width, depth, height = size
    vertices = [
        (-width / 2, -depth / 2, 0), (width / 2, -depth / 2, 0),
        (-width / 2, depth / 2, 0), (width / 2, depth / 2, 0),
        (-width / 2, 0, height), (width / 2, 0, height),
    ]
    faces = [
        (0, 1, 5, 4), (2, 4, 5, 3), (0, 4, 2), (1, 3, 5), (0, 2, 3, 1),
    ]
    mesh = bpy.data.meshes.new(name + "_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    roof = bpy.data.objects.new(name, mesh)
    collection.objects.link(roof)
    roof.parent = parent
    roof.location = position
    roof.data.materials.append(material)
    bevel = roof.modifiers.new("Soft illustrated roof edges", "BEVEL")
    bevel.width = 0.10
    bevel.segments = 2
    return roof


def create_torii(parent, name, location, scale=1.0):
    gate = base.empty(name, location, parent, parent.users_collection[0])
    for side in (-1, 1):
        base.cylinder(gate, f"{name}_post_{side}", (side * 1.55 * scale, 0, 2.1 * scale), 0.18 * scale, 4.2 * scale, MATS["coral"], 10)
        base.box(gate, f"{name}_foot_{side}", (side * 1.55 * scale, 0, 0.23 * scale), (0.62 * scale, 0.62 * scale, 0.46 * scale), MATS["ink"], 0.05)
    base.box(gate, f"{name}_beam_low", (0, 0, 3.55 * scale), (3.9 * scale, 0.36 * scale, 0.36 * scale), MATS["coral"], 0.08)
    base.box(gate, f"{name}_beam_high", (0, 0, 4.1 * scale), (4.7 * scale, 0.48 * scale, 0.34 * scale), MATS["coral"], 0.10)
    base.box(gate, f"{name}_plaque", (0, -0.25 * scale, 3.78 * scale), (0.75 * scale, 0.15 * scale, 0.70 * scale), MATS["ink"], 0.04)
    return gate


def rod_between(parent, name, start, end, radius, material):
    start_point = Vector(start)
    end_point = Vector(end)
    direction = end_point - start_point
    rod = base.cylinder(parent, name, (start_point + end_point) * 0.5, radius, direction.length, material, 10)
    rod.rotation_mode = "QUATERNION"
    rod.rotation_quaternion = direction.to_track_quat("Z", "Y")
    return rod


def bicycle_wheel(parent, name, x):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.62,
        minor_radius=0.075,
        major_segments=18,
        minor_segments=6,
        location=(x, 0, 0.72),
        rotation=(math.radians(90), 0, 0),
    )
    wheel = bpy.context.object
    wheel.name = name
    wheel.data.materials.append(MATS["rail"])
    wheel.parent = parent
    base.move_to_collection(wheel, parent.users_collection[0])
    base.cylinder(parent, f"{name}_hub", (x, 0, 0.72), 0.11, 0.22, MATS["stone_light"], 10, (math.radians(90), 0, 0))
    for spoke in range(8):
        angle = spoke * math.tau / 8
        rod_between(
            parent,
            f"{name}_spoke_{spoke}",
            (x, 0, 0.72),
            (x + math.cos(angle) * 0.56, 0, 0.72 + math.sin(angle) * 0.56),
            0.018,
            MATS["stone_light"],
        )
    return wheel


def create_bicycles(parent, collection, protected_paths, obstacle_specs, roadside_specs):
    desired_positions = [
        (-268, -96), (-155, -55), (-62, 14), (62, -28), (157, 16), (246, 97),
    ]
    colors = ("coral", "blue", "yellow", "teal", "pink", "saffron")
    for index, desired in enumerate(desired_positions):
        x, y, angle, _ = grand.find_roadside_position(
            desired, 2.05, protected_paths, -1 if index % 2 else 1, obstacle_specs, roadside_specs
        )
        name = "BICYCLE" if index == 0 else f"BICYCLE_DISTRICT_{index:02d}"
        bicycle = base.empty(name, (x, y, terrain_height(x, y) + 0.04), parent, collection)
        bicycle.rotation_euler[2] = angle
        bicycle["vehicle_type"] = "bicycle"
        bicycle["vehicle_name"] = "Free bicycle"
        bicycle["free_to_ride"] = True
        bicycle["home_district"] = DISTRICTS[index]["name"]
        frame = MATS[colors[index]]
        bicycle_wheel(bicycle, f"Bicycle_wheel_{index}_rear", -1.05)
        bicycle_wheel(bicycle, f"Bicycle_wheel_{index}_front", 1.05)
        rear = (-1.05, 0, 0.72)
        crank = (-0.12, 0, 0.72)
        seat_post = (-0.46, 0, 1.48)
        handle = (0.78, 0, 1.55)
        for rod_index, (start, end) in enumerate((
            (rear, crank), (crank, seat_post), (seat_post, rear),
            (seat_post, handle), (handle, (1.05, 0, 0.72)), (crank, handle),
        )):
            rod_between(bicycle, f"Bicycle_frame_{index}_{rod_index}", start, end, 0.075, frame)
        base.box(bicycle, f"Bicycle_seat_{index}", (-0.52, 0, 1.58), (0.48, 0.28, 0.12), MATS["ink"], 0.04)
        base.cylinder(bicycle, f"Bicycle_handlebar_{index}", (0.78, 0, 1.62), 0.055, 0.88, MATS["rail"], 10, (math.radians(90), 0, 0))
        crank_root = base.empty(f"Bicycle_crank_{index}", crank, bicycle, collection)
        base.cylinder(crank_root, f"Bicycle_pedal_axle_{index}", (0, 0, 0), 0.13, 0.20, MATS["rail"], 12, (math.radians(90), 0, 0))
        for side in (-1, 1):
            rod_between(crank_root, f"Bicycle_pedal_arm_{index}_{side}", (0, side * 0.10, 0), (side * 0.30, side * 0.10, 0.12), 0.035, MATS["rail"])
        basket = base.box(bicycle, f"Bicycle_basket_{index}", (0.85, 0, 1.34), (0.48, 0.70, 0.42), MATS["cream"], 0.05)
        basket["bicycle_basket"] = True
        base.empty("BICYCLE_DRIVER_SEAT", (-0.48, 0, 1.70), bicycle, collection)["vehicle_seat"] = True
        base.empty("BICYCLE_EXIT_POINT", (-0.45, -1.35, 0.08), bicycle, collection)["vehicle_exit"] = True
        pad = base.empty(f"BICYCLE_PARKING_{index:02d}", (x, y, terrain_height(x, y) + 0.06), parent, collection)
        pad.rotation_euler[2] = angle
        pad["parking_label"] = "FREE BICYCLE"
        base.box(pad, f"Bicycle_pad_{index}", (0, 0, 0), (3.7, 2.2, 0.10), MATS["stone_light"], 0.06)
        base.text_mesh(pad, f"Bicycle_free_text_{index}", "FREE BIKE", (-1.45, -1.13, 0.10), 0.22, MATS["teal_dark"])
        grand.mark_roadside(pad, 2.05, protected_paths, roadside_specs, "bicycle_parking")


def create_japanese_building(parent, collection, label, x, y, index, kind, obstacle_specs):
    modern = kind == "modern" or (kind == "mixed" and index % 2 == 0)
    width = 7.4 + (index % 2) * 1.2
    depth = 5.4 + (index % 3) * 0.55
    floors = (3 + index % 2) if modern else (1 + (index % 4 == 0))
    height = floors * 2.5
    root = base.empty(f"OBSTACLE_{label}", (x, y, terrain_height(x, y)), parent, collection)
    root["obstacle"] = True
    root["building_style"] = "japanese_modern" if modern else "japanese_traditional"
    wall_material = MATS[("cream", "white", "blue", "pink", "teal")[index % 5]]
    base.box(root, f"{label}_body", (0, 0, height / 2), (width, depth, height), wall_material, 0.15)
    base.box(root, f"{label}_foundation", (0, 0, 0.20), (width + 0.35, depth + 0.35, 0.40), MATS["stone_light"], 0.08)
    front_y = -depth * 0.51
    if modern:
        base.box(root, f"{label}_roof", (0, 0, height + 0.18), (width + 0.35, depth + 0.35, 0.34), MATS["teal_dark"], 0.07)
        stripe = MATS[("coral", "teal", "blue", "yellow")[index % 4]]
        base.box(root, f"{label}_shop_band", (0, front_y - 0.09, 2.05), (width * 0.90, 0.18, 0.55), stripe, 0.04)
        sign = base.box(root, f"{label}_vertical_sign", (width * 0.42, front_y - 0.17, min(height - 0.6, 4.2)), (0.72, 0.22, 2.8), MATS["white"], 0.05)
        sign["japanese_sign"] = True
        for floor in range(floors):
            for side in (-1, 1):
                base.box(root, f"{label}_window_{floor}_{side}", (side * width * 0.24, front_y - 0.10, 1.25 + floor * 2.35), (1.30, 0.15, 1.05), MATS["teal_dark"], 0.04)
        if index % 2 == 0:
            machine = base.box(root, f"{label}_vending_machine", (-width * 0.34, front_y - 0.45, 1.0), (1.0, 0.55, 2.0), MATS["white"], 0.08)
            machine["japanese_vending_machine"] = True
            base.box(root, f"{label}_vending_display", (-width * 0.34, front_y - 0.75, 1.27), (0.72, 0.06, 0.72), MATS["blue"], 0.03)
    else:
        gable_roof(root, f"{label}_gable_roof", (0, 0, height), (width + 1.15, depth + 1.3, 1.65), MATS[("ink", "teal_dark", "coral")[index % 3]], collection)
        base.box(root, f"{label}_engawa", (0, front_y - 0.48, 0.42), (width * 0.88, 1.0, 0.28), MATS["wood"], 0.05)
        for side in (-1, 0, 1):
            base.box(root, f"{label}_shoji_{side}", (side * width * 0.26, front_y - 0.11, 1.38), (width * 0.20, 0.12, 1.65), MATS["cream"], 0.03)
            base.box(root, f"{label}_shoji_frame_{side}", (side * width * 0.26, front_y - 0.19, 1.38), (0.10, 0.08, 1.75), MATS["wood"], 0.02)
        for side in (-1, 1):
            lantern = base.cylinder(root, f"{label}_lantern_{side}", (side * width * 0.37, front_y - 0.65, 2.2), 0.28, 0.62, MATS["coral"], 10)
            lantern["lantern"] = True
    readable = label.replace("_", " ")
    board_width = min(5.9, width * 0.78)
    base.box(root, f"{label}_name_board", (0, front_y - 0.31, 2.52), (board_width, 0.16, 0.54), MATS["teal_dark"], 0.05)
    base.text_mesh(root, f"{label}_name_text", readable, (0, front_y - 0.42, 2.53), min(0.27, 4.2 / max(9, len(readable))), MATS["white"])
    obstacle_specs.append((root.name, Vector((x, y)), max(width, depth) * 0.57))
    return root


def find_clear_japan_building_position(center, index, radius, protected_paths, obstacle_specs):
    """Place dense Japanese blocks while preserving every authored travel corridor."""
    cx, cy = center
    route_points = [Vector(point) for path in protected_paths.values() for point in path]
    for ring in (13.0, 16.0, 19.0, 22.0, 26.0, 30.0, 34.0, 38.0, 42.0):
        for angle_step in range(24):
            angle = (index * 1.83 + angle_step * math.tau / 24.0) % math.tau
            candidate = Vector((cx + math.cos(angle) * ring, cy + math.sin(angle) * ring))
            if not (-292 <= candidate.x <= 292 and -142 <= candidate.y <= 142):
                continue
            route_clearance = min((candidate - point).length for point in route_points) - radius
            if route_clearance < 3.35:
                continue
            if any((candidate - other_center).length < radius + other_radius + 2.4
                   for _, other_center, other_radius in obstacle_specs):
                continue
            return candidate.x, candidate.y
    raise RuntimeError(f"Could not place Japanese building {index} safely near {center}")


def create_district(parent, collection, district, obstacle_specs, protected_paths, roadside_specs):
    cx, cy = district["center"]
    root = base.empty(district["root"], (0, 0, 0), parent, collection)
    root["district_name"] = district["name"]
    root["country"] = "Japan"
    for index, label in enumerate(district["labels"]):
        radius = 4.95
        x, y = find_clear_japan_building_position((cx, cy), index, radius, protected_paths, obstacle_specs)
        create_japanese_building(root, collection, label, x, y, index, district["kind"], obstacle_specs)

    sx, sy, angle, _ = grand.find_roadside_position(
        (cx - 4, cy - 3), 2.8, protected_paths, obstacle_specs=obstacle_specs, roadside_specs=roadside_specs
    )
    sign = base.empty(f"SIGN_{district['root']}", (sx, sy, terrain_height(sx, sy)), root, collection)
    sign.rotation_euler[2] = angle
    japanese_names = {
        "Sakura Gate": "桜門", "Konbini Street": "コンビニ通り", "Kawa Market": "川市場",
        "Midori Village": "みどり村", "Inari Hill": "稲荷山", "Yama Onsen": "山温泉",
    }
    sign["hindi"] = japanese_names[district["name"]]
    sign["romaji"] = district["name"]
    sign["english"] = district["name"]
    sign["prompt"] = "Read the Japanese place sign"
    base.box(sign, f"{district['root']}_sign_board", (0, 0, 2.0), (5.7, 0.30, 1.8), MATS["teal_dark"], 0.08)
    base.text_mesh(sign, f"{district['root']}_sign_text", district["name"].upper(), (0, -0.21, 2.02), 0.26, MATS["white"])
    for side in (-1, 1):
        base.box(sign, f"{district['root']}_sign_post_{side}", (side * 2.1, 0, 0.9), (0.20, 0.20, 1.8), MATS["wood"], 0.03)
    grand.mark_roadside(sign, 2.8, protected_paths, roadside_specs, "district_sign")
    return root


def create_person(parent, name, style_index):
    visual = grand.create_stylized_person(parent, name, style_index)
    if style_index % 2 == 0:
        base.box(visual, f"{name}_city_backpack", (0, 0.33, 1.55), (0.55, 0.28, 0.75), MATS["teal_dark"], 0.08)
    else:
        base.box(visual, f"{name}_jacket_panel", (0, -0.37, 1.62), (0.48, 0.08, 0.82), MATS[("blue", "coral", "teal")[style_index % 3]], 0.04)
    return visual


def create_interactions(parent, collection, protected_paths, obstacle_specs, roadside_specs):
    definitions = [
        ("INTERACT_LOCAL_FRIEND", (-248, -69), "Practise a polite greeting", "practice_greeting", "こんにちは。はじめまして。", "Konnichiwa. Hajimemashite.", "Hello. Nice to meet you.", "Haru"),
        ("INTERACT_CHAI_VENDOR", (-150, -49), "Practise ordering ramen", "practice_food", "いらっしゃいませ。ご注文は？", "Irasshaimase. Gochūmon wa?", "Welcome. What would you like to order?", "Aiko"),
        ("INTERACT_FRUIT_VENDOR", (-137, -24), "Practise at a convenience store", "practice_shop", "いらっしゃいませ。", "Irasshaimase.", "Welcome.", "Kenji"),
        ("INTERACT_DIRECTIONS_LOCAL", (-24, 20), "Practise asking for directions", "practice_directions", "どうしましたか？", "Dō shimashita ka?", "How can I help?", "Yui"),
        ("INTERACT_PHARMACIST", (64, -47), "Practise speaking at a pharmacy", "practice_pharmacy", "どうされましたか？", "Dō saremashita ka?", "What seems to be the problem?", "Emi"),
        ("INTERACT_TICKET_CLERK", (-259, -72), "Practise buying a subway ticket", "practice_train", "どちらまでですか？", "Dochira made desu ka?", "Where are you travelling to?", "Sota"),
        ("INTERACT_SHRINE_KEEPER", (171, 52), "Talk to the shrine keeper", "ambient_talk", "お参りの前に手を清めます。", "Omairi no mae ni te o kiyomemasu.", "Purify your hands before praying.", "Rei"),
        ("INTERACT_ONSEN_HOST", (257, 98), "Talk to the ryokan host", "ambient_talk", "温泉は二階です。", "Onsen wa nikai desu.", "The hot spring is on the second floor.", "Mika"),
    ]
    for index, (name, desired, prompt, action, jp, romaji, en, speaker) in enumerate(definitions):
        x, y, angle, _ = grand.find_roadside_position(
            desired, 0.72, protected_paths, -1 if index % 2 else 1, obstacle_specs, roadside_specs
        )
        item = base.empty(name, (x, y, terrain_height(x, y)), parent, collection)
        item.rotation_euler[2] = angle
        item["prompt"] = prompt
        item["action"] = action
        item["dialogue_hi"] = jp
        item["dialogue_romaji"] = romaji
        item["dialogue_en"] = en
        item["speaker_name"] = speaker
        item["lesson_target"] = action.startswith("practice_")
        create_person(item, name.replace("INTERACT_", "NPC_"), index)
        grand.mark_roadside(item, 0.72, protected_paths, roadside_specs, "interaction")

    ambient_positions = [(-225, -102), (-176, -56), (-118, -17), (-55, 48), (21, -70), (92, -47), (147, 30), (205, 70), (276, 118)]
    ambient_phrases = [
        ("おはようございます。", "Ohayō gozaimasu.", "Good morning."),
        ("今日は暑いですね。", "Kyō wa atsui desu ne.", "It is hot today, isn't it?"),
        ("気をつけて。", "Ki o tsukete.", "Take care."),
    ]
    for index, desired in enumerate(ambient_positions):
        x, y, angle, _ = grand.find_roadside_position(
            desired, 0.72, protected_paths, -1 if index % 2 else 1, obstacle_specs, roadside_specs
        )
        npc = base.empty(f"NPC_ROUTINE_{index:02d}", (x, y, terrain_height(x, y)), parent, collection)
        npc.rotation_euler[2] = angle
        npc["routine_radius"] = 3.5 + index % 4
        npc["routine_speed"] = 0.45 + (index % 3) * 0.10
        jp, romaji, en = ambient_phrases[index % len(ambient_phrases)]
        npc["dialogue_hi"] = jp
        npc["dialogue_romaji"] = romaji
        npc["dialogue_en"] = en
        create_person(npc, f"JP_LOCAL_{index:02d}", index + 3)
        grand.mark_roadside(npc, 0.72, protected_paths, roadside_specs, "npc_routine")


def create_subway(parent, collection):
    controls = [
        (-289, -116), (-292, -92), (-291, -58), (-286, -18), (-278, 24),
        (-266, 62), (-244, 96), (-210, 119), (-164, 132), (-112, 136),
        (-58, 132), (-4, 126), (48, 131), (101, 139), (151, 138),
        (194, 134), (224, 128), (247, 120), (265, 111),
    ]
    path = base.sample_path(controls, 14)
    corridor = base.empty("TOKYO_SUBWAY_CORRIDOR", (0, 0, 0), parent, collection)
    corridor["transport_type"] = "subway"
    base.create_ribbon(corridor, "SUBWAY_BALLAST", path, 3.7, MATS["stone"], collection, 0.30, False)
    for side in (-1, 1):
        base.create_ribbon(corridor, f"SUBWAY_RAIL_{side}", base.offset_path(path, side * 1.02), 0.18, MATS["rail"], collection, 0.48, False)
    for index in range(0, len(path), 4):
        point = Vector(path[index])
        previous = Vector(path[max(0, index - 1)])
        following = Vector(path[min(len(path) - 1, index + 1)])
        angle = math.atan2((following - previous).y, (following - previous).x)
        base.box(corridor, f"BATCH_SUBWAY_SLEEPER_{index:03d}", (point.x, point.y, terrain_height(point.x, point.y) + 0.36), (0.34, 2.9, 0.16), MATS["wood"], 0.02, (0, 0, angle))
    grand.add_route_markers(parent, collection, "TRAIN_ROUTE", controls)

    train = base.empty("TOY_TRAIN", (controls[0][0], controls[0][1], terrain_height(*controls[0]) + 1.0), parent, collection)
    train["speed_mps"] = 22.0
    train["vehicle_name"] = "Aozora Subway"
    train["transport_type"] = "subway"
    for car_index in range(5):
        car = base.empty(f"Train_car_{car_index}", (-car_index * 5.5, 0, 0), train, collection)
        base.box(car, f"Train_car_body_{car_index}", (0, 0, 1.42), (5.0, 2.42, 2.35), MATS["white"], 0.22)
        base.box(car, f"Train_blue_stripe_{car_index}", (0, -1.23, 1.40), (4.72, 0.10, 0.42), MATS["blue"], 0.02)
        base.box(car, f"Train_car_roof_{car_index}", (0, 0, 2.69), (5.08, 2.50, 0.28), MATS["rail"], 0.10)
        for window_index in (-1.55, 0, 1.55):
            base.box(car, f"Train_window_{car_index}_{window_index}", (window_index, -1.25, 1.98), (1.12, 0.10, 0.70), MATS["teal_dark"], 0.03)
        if car_index > 0:
            door = base.box(car, f"TRAIN_DOOR_{car_index:02d}", (0, -1.28, 1.42), (0.92, 0.12, 1.75), MATS["stone_light"], 0.04)
            door["train_door"] = True
        for side in (-1, 1):
            for axle in (-1.6, 1.6):
                base.cylinder(car, f"Train_wheel_{car_index}_{side}_{axle}", (axle, side * 1.12, 0.34), 0.44, 0.22, MATS["rail"], 12, (math.radians(90), 0, 0))
    base.empty("TRAIN_PLAYER_SEAT", (-5.5, 0, 1.30), train, collection)["vehicle_seat"] = True
    base.empty("TRAIN_EXIT_POINT", (-5.5, -2.25, 0.20), train, collection)["vehicle_exit"] = True

    stops = [
        ((-289, -105), "Sakura Gate", "桜門", (-256, -83)),
        ((-273, 48), "Bamboo Park", "竹公園", (-240, 30)),
        ((-77, 134), "Kawa Market", "川市場", (-45, 58)),
        ((151, 138), "Inari Hill", "稲荷山", (176, 70)),
        ((258, 115), "Yama Onsen", "山温泉", (258, 105)),
    ]
    links = {}
    for index, ((x, y), name, jp, (link_x, link_y)) in enumerate(stops):
        stop = base.empty(f"TRAIN_STOP_{index:02d}", (x, y, terrain_height(x, y) + 0.18), parent, collection)
        stop["stop_name"] = name
        stop["announcement_hi"] = f"次は {jp} です"
        stop["announcement_romaji"] = f"Tsugi wa {name} desu"
        base.box(stop, f"Subway_platform_{index}", (0, -4.0, 0.25), (19, 4.2, 0.50), MATS["stone_light"], 0.08)
        base.box(stop, f"Subway_canopy_{index}", (0, -4.2, 3.1), (12.0, 3.3, 0.28), MATS["blue"], 0.10)
        for side in (-4.5, 4.5):
            base.box(stop, f"Subway_canopy_post_{index}_{side}", (side, -4.2, 1.55), (0.22, 0.22, 3.1), MATS["rail"], 0.03)
        zone = base.empty(f"TRAIN_BOARDING_ZONE_{index:02d}", (0, -3.8, 0.55), stop, collection)
        zone["boarding_zone"] = True
        base.box(zone, f"Boarding_zone_mark_{index}", (0, 0, 0), (7.5, 0.26, 0.05), MATS["yellow"], 0.02)
        sign = base.empty(f"SIGN_TRAIN_STOP_{index:02d}", (0, -5.5, 0), stop, collection)
        sign["hindi"] = jp
        sign["romaji"] = name
        sign["english"] = name
        sign["prompt"] = "Read the subway station sign"
        base.box(sign, f"Station_sign_board_{index}", (0, 0, 2.0), (6.3, 0.28, 1.6), MATS["white"], 0.07)
        base.text_mesh(sign, f"Station_sign_english_{index}", name.upper(), (0, -0.20, 2.0), min(0.31, 4.8 / max(9, len(name))), MATS["teal_dark"])
        link = base.sample_path([(x, y - 5), ((x + link_x) * 0.5, (y + link_y) * 0.5), (link_x, link_y)], 9)
        base.create_ribbon(parent, f"WALKABLE_STATION_LINK_{index:02d}", link, 2.8, MATS["stone_light"], collection, 0.15)
        links[f"station_link_{index}"] = link

    for x, y, angle in ((-285, -34, 0.1), (230, 127, -0.2)):
        tunnel = base.empty(f"SUBWAY_TUNNEL_{int(x)}", (x, y, terrain_height(x, y)), parent, collection)
        base.ico(tunnel, "Subway_tunnel_shell", (0, 0, 2.9), 1, MATS["stone"], 2, (5.8, 4.0, 5.3))
        base.ico(tunnel, "Subway_tunnel_mouth", (0, -2.9, 2.3), 1, MATS["ink"], 2, (3.2, 0.55, 3.1))
        tunnel.rotation_euler[2] = angle
    return path, links


def create_japan_landmarks(parent, collection, protected_paths, obstacle_specs, roadside_specs):
    # Central koi pond and arched red footbridge.
    pond = base.empty("SCENERY_KAWA_POND", (-39, 31, terrain_height(-39, 31)), parent, collection)
    base.ico(pond, "SCENERY_KOI_WATER", (0, 0, 0.16), 1, MATS["water"], 2, (24, 16, 0.18))
    bridge_path = base.sample_path([(-66, 30), (-57, 31), (-48, 31), (-42, 31)], 4)
    base.create_ribbon(parent, "WALKABLE_KAWA_RED_BRIDGE", bridge_path, 2.8, MATS["coral"], collection, 0.52)
    for index, (x, y) in enumerate(bridge_path[::5]):
        base.box(parent, f"BATCH_RED_BRIDGE_RAIL_{index}", (x, y - 1.45, terrain_height(x, y) + 1.0), (0.18, 0.18, 1.25), MATS["coral"], 0.03)

    # The user's detailed, textured torii asset marks the eastern shrine climb.
    inari = base.empty("LANDMARK_INARI_TORII_PATH", (0, 0, 0), parent, collection)
    torii_points = ((154, 27), (164, 38), (176, 48), (188, 59), (201, 73))
    torii_template = import_torii_gate_template(collection)
    for index, (x, y) in enumerate(torii_points):
        gate = base.empty(f"INARI_TORII_{index:02d}", (x, y, terrain_height(x, y)), inari, collection)
        previous = torii_points[max(0, index - 1)]
        following = torii_points[min(len(torii_points) - 1, index + 1)]
        direction_x = following[0] - previous[0]
        direction_y = following[1] - previous[1]
        gate.rotation_euler[2] = math.atan2(-direction_x, direction_y)
        visual = torii_template if index == 0 else linked_hierarchy_copy(torii_template, gate, collection, f"{index:02d}")
        visual.parent = gate
        # Source units are roughly centimetres: this restores a 4–5 m game gate.
        authored_scale = 0.0047 + index * 0.00018
        visual.scale = (authored_scale, authored_scale, authored_scale)
        gate["source_asset"] = "japanese_torii_gate_game_asset.glb"
        gate["asset_license"] = "CC-BY-4.0"
        gate["shared_mesh_instance"] = True
        gate["discovery_name"] = "Fushimi-style torii path"

    shrine = base.empty("LANDMARK_INARI_SHRINE", (181, 61, terrain_height(181, 61)), parent, collection)
    base.box(shrine, "Inari_shrine_body", (0, 0, 1.6), (7.8, 5.8, 3.2), MATS["cream"], 0.13)
    gable_roof(shrine, "Inari_shrine_roof", (0, 0, 3.2), (9.6, 7.2, 2.0), MATS["coral"], collection)
    for side in (-1, 1):
        base.ico(shrine, f"Inari_fox_{side}", (side * 2.5, -3.2, 0.75), 0.65, MATS["stone_light"], 2, (0.65, 0.55, 1.15))

    # Modern zebra crossings, lantern alley, bamboo, rice terraces, and onsen.
    crossings = [(-253, -82, 0.42), (-154, -37, -0.35)]
    for crossing_index, (x, y, angle) in enumerate(crossings):
        root = base.empty(f"LANDMARK_ZEBRA_CROSSING_{crossing_index}", (x, y, terrain_height(x, y) + 0.17), parent, collection)
        root.rotation_euler[2] = angle
        for stripe in range(-4, 5):
            base.box(root, f"BATCH_ZEBRA_{crossing_index}_{stripe}", (stripe * 0.72, 0, 0), (0.42, 5.8, 0.035), MATS["white"], 0.01)

    alley = base.empty("LANDMARK_LANTERN_ALLEY", (-145, -17, terrain_height(-145, -17)), parent, collection)
    for index in range(10):
        base.cylinder(alley, f"Lantern_{index}", ((index - 4.5) * 1.4, 0, 2.65 + math.sin(index) * 0.12), 0.30, 0.65, MATS[("coral", "yellow")[index % 2]], 10)

    bamboo = base.empty("BACKGROUND_BAMBOO_GROVE", (0, 0, 0), parent, collection)
    for index in range(75):
        x = random.uniform(18, 126)
        y = random.uniform(48, 118)
        point = Vector((x, y))
        if min((point - Vector(sample)).length for path in protected_paths.values() for sample in path) < 7.0:
            continue
        height = random.uniform(5.0, 9.0)
        base.cylinder(bamboo, f"BATCH_BAMBOO_{index:03d}", (x, y, terrain_height(x, y) + height / 2), 0.13, height, MATS["grass_dark"], 7)
        for leaf in range(3):
            base.ico(bamboo, f"BATCH_BAMBOO_LEAF_{index}_{leaf}", (x + (leaf - 1) * 0.35, y, terrain_height(x, y) + height - leaf * 0.55), 0.45, MATS["grass"], 1, (1.4, 0.35, 0.45))

    terraces = base.empty("BACKGROUND_JAPAN_RICE_TERRACES", (0, 0, 0), parent, collection)
    for field_index, (x, y, width) in enumerate(((30, -104, 38), (84, -112, 43), (136, -102, 35), (206, -83, 31))):
        for strip in range(6):
            base.box(terraces, f"BATCH_RICE_FIELD_{field_index}_{strip}", (x, y + strip * 2.2, terrain_height(x, y + strip * 2.2) + 0.11), (width - strip * 1.5, 1.5, 0.22), MATS[("grass_light", "water")[strip % 2]], 0.04)

    onsen = base.empty("LANDMARK_YAMA_ONSEN", (270, 119, terrain_height(270, 119)), parent, collection)
    base.ico(onsen, "Onsen_pool", (0, 0, 0.28), 1, MATS["water"], 2, (6.2, 4.2, 0.32))
    for index in range(7):
        angle = index * math.tau / 7
        base.ico(onsen, f"Onsen_rock_{index}", (math.cos(angle) * 5.6, math.sin(angle) * 3.8, 0.65), 0.85, MATS["stone"], 1)

    # Tall Fuji silhouette at the far side gives every long view an identity.
    fuji = base.empty("BACKGROUND_MOUNT_FUJI", (238, 166, terrain_height(238, 150)), parent, collection)
    base.ico(fuji, "BACKGROUND_FUJI_BASE", (0, 0, 22), 1, MATS["teal_dark"], 2, (48, 22, 42))
    base.ico(fuji, "BACKGROUND_FUJI_SNOW", (0, 0, 42), 1, MATS["white"], 2, (21, 10, 13))


def create_scenery(parent, collection, protected_paths, obstacle_specs):
    route_points = [Vector(point) for path in protected_paths.values() for point in path]
    obstacle_centers = [(center, radius) for _, center, radius in obstacle_specs]
    forest = base.empty("SCENERY_JAPAN_TREES", (0, 0, 0), parent, collection)
    created = 0
    attempts = 0
    while created < 185 and attempts < 4200:
        attempts += 1
        x, y = random.uniform(-292, 292), random.uniform(-143, 143)
        point = Vector((x, y))
        if min((point - sample).length for sample in route_points) < 7.2:
            continue
        if any((point - center).length < radius + 4.5 for center, radius in obstacle_centers):
            continue
        if ((x + 39) / 28) ** 2 + ((y - 31) / 20) ** 2 < 1.2:
            continue
        scale = random.uniform(0.8, 1.4)
        tree = base.empty(f"SCENERY_JP_TREE_{created:03d}", (x, y, terrain_height(x, y)), forest, collection)
        base.cylinder(tree, f"BATCH_JP_TRUNK_{created:03d}", (0, 0, 1.4 * scale), 0.25 * scale, 2.8 * scale, MATS["wood"], 8)
        material = MATS[("pink", "sakura_light", "sakura_deep")[created % 3]]
        canopy = base.ico(tree, f"BATCH_JP_CANOPY_{created:03d}", (0, 0, 3.4 * scale), 1.45 * scale, material, 1, (1.1, 0.92, 1.05))
        canopy["wind_phase"] = created * 0.31
        created += 1

    # Four different edges avoid exposed rectangular map cutoffs.
    west = base.empty("BACKGROUND_JAPAN_WEST_CITY", (0, 0, 0), parent, collection)
    for index, y in enumerate(range(-145, 151, 18)):
        height = 11 + index % 4 * 3
        base.box(west, f"BATCH_WEST_CITY_{index:02d}", (-307, y, height / 2 - 1), (12, 14, height), MATS[("white", "blue", "cream")[index % 3]], 0.18)
    east = base.empty("BACKGROUND_JAPAN_EAST_MOUNTAINS", (0, 0, 0), parent, collection)
    for index, y in enumerate(range(-150, 151, 20)):
        height = 15 + (index * 5) % 12
        base.ico(east, f"BACKGROUND_EAST_JP_HILL_{index:02d}", (309, y, terrain_height(300, y) + height * 0.38), 1, MATS[("grass_dark", "stone", "earth_light")[index % 3]], 2, (12, 14, height))
    # The playable terrain ends at y=150. The original decorative Sakura row
    # stood at y=158 with nothing below it, so it appeared to float against the
    # sky whenever the player reached the northern rail corridor. Extend the
    # terrain visually and physically first, then plant every trunk on the same
    # sampled surface used by that extension.
    north_ground = base.empty("BACKGROUND_JAPAN_NORTH_GROUNDED_EDGE", (0, 0, 0), parent, collection)
    north_path = base.sample_path([(-299, 157), (299, 157)], 84)
    base.create_ribbon(
        north_ground,
        "WALKABLE_JAPAN_NORTH_EMBANKMENT",
        north_path,
        18.0,
        MATS["grass"],
        collection,
        0.02,
    )
    for edge_index, x in enumerate(range(-296, 297, 16)):
        ground_z = terrain_height(x, 157)
        base.box(
            north_ground,
            f"BACKGROUND_NORTH_EARTH_{edge_index:03d}",
            (x, 160.5, ground_z - 2.55),
            (16.5, 13.0, 5.2),
            MATS["earth"],
            0.10,
        )
    north = base.empty("BACKGROUND_JAPAN_NORTH_SAKURA_WALL", (0, 0, 0), parent, collection)
    for index, x in enumerate(range(-294, 295, 16)):
        scale = 1.0 + (index % 5) * 0.12
        ground_z = terrain_height(x, 157) + 0.02
        trunk = base.cylinder(north, f"BATCH_NORTH_SAKURA_TRUNK_{index:03d}", (x, 157, ground_z + 2.3 * scale), 0.28, 4.6 * scale, MATS["wood"], 7)
        trunk["grounded_at_z"] = round(ground_z, 4)
        base.ico(north, f"BATCH_NORTH_SAKURA_{index:03d}", (x, 157, ground_z + 5.1 * scale), 1, MATS[("pink", "sakura_light", "sakura_deep")[index % 3]], 1, (2.8 * scale, 2.2 * scale, 2.7 * scale))
    south = base.empty("BACKGROUND_JAPAN_SOUTH_SEAWALL", (0, 0, 0), parent, collection)
    for index, x in enumerate(range(-290, 291, 25)):
        z = terrain_height(x, -150)
        base.box(south, f"BATCH_SOUTH_SEAWALL_{index:03d}", (x, -155, z - 2.8), (26, 12, 6.0), MATS[("stone", "stone_light")[index % 2]], 0.12)
        base.box(south, f"BATCH_SOUTH_GRASS_TOP_{index:03d}", (x, -151, z + 0.25), (26, 7, 0.45), MATS["grass"], 0.08)


def create_character(parent, collection):
    player = base.create_character(parent, collection)
    x, y = -272.0, -103.0
    player.location = (x, y, terrain_height(x, y) + 0.08)
    player["spawn_heading_x"] = 0.88
    player["spawn_heading_z"] = -0.47
    player["traveller_world"] = "japanese"
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
        "world_id": "japanese",
        "map_dimensions_m": [600, 300],
        "playable_ground_mode": "level",
        "playable_ground_z_m": grand.PLAYABLE_GROUND_Z,
        "playable_elevation_span_m": round(playable_elevation_span, 6),
        "district_count": len(DISTRICTS),
        "districts": [item["name"] for item in DISTRICTS],
        "walkable_count": len(walkables),
        "obstacle_count": len(obstacle_specs),
        "interaction_count": 8,
        "lesson_target_count": 6,
        "npc_routine_count": 9,
        "subway_stop_count": 5,
        "torii_gate_count": len([obj for obj in bpy.data.objects if obj.name.startswith("INARI_TORII_")]),
        "torii_source_asset": "japanese_torii_gate_game_asset.glb",
        "bicycle_count": len([obj for obj in bpy.data.objects if obj.name == "BICYCLE" or obj.name.startswith("BICYCLE_DISTRICT_")]),
        "transport_modes": ["walking", "bicycle", "subway"],
        "minimum_roadside_clearance_m": round(min(item[3] for item in roadside_specs), 3),
    }
    with open(REPORT_PATH, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2, ensure_ascii=False)
    print("NIMBU_JAPAN_LAYOUT", json.dumps(report, ensure_ascii=False))
    if blocked:
        raise RuntimeError("Japanese protected corridors blocked by: " + ", ".join(blocked))
    return report


def build():
    base.clear_scene()
    export = base.make_collection("EXPORT_NIMBU_JAPAN_WORLD")
    root = base.empty("WORLD_NIMBU_JAPAN", collection=export)
    root["world_id"] = "japanese"
    root["world_style"] = "colorful_low_poly_japan"
    root["playable_ground_mode"] = "level"
    root["playable_ground_z_m"] = grand.PLAYABLE_GROUND_Z
    root["map_width_m"] = 600
    root["map_depth_m"] = 300
    root["district_count"] = 6
    root["transport_modes"] = "walking,bicycle,subway"

    grand.create_terrain(root, export)
    protected_paths, _ = grand.create_road_network(root, export)
    road_root = bpy.data.objects.get("INDIA_VEHICLE_ROAD_NETWORK")
    if road_root:
        road_root.name = "JAPAN_STREET_AND_WALKING_NETWORK"
    subway_path, station_links = create_subway(root, export)
    protected_paths["rail"] = subway_path
    protected_paths.update(station_links)
    obstacle_specs = []
    roadside_specs = []
    for district in DISTRICTS:
        create_district(root, export, district, obstacle_specs, protected_paths, roadside_specs)
    create_interactions(root, export, protected_paths, obstacle_specs, roadside_specs)
    create_japan_landmarks(root, export, protected_paths, obstacle_specs, roadside_specs)
    create_bicycles(root, export, protected_paths, obstacle_specs, roadside_specs)
    create_scenery(root, export, protected_paths, obstacle_specs)
    create_character(root, export)
    report = validate(protected_paths, obstacle_specs, roadside_specs)

    grand.configure_render(export)
    gameplay_camera = base.create_camera("CAMERA_JAPAN_GAMEPLAY", (-292, -128, 18), (-245, -75, 2), 52)
    overview_camera = base.create_camera("CAMERA_JAPAN_OVERVIEW", (-430, -480, 420), (0, 0, 5), 58)
    city_camera = base.create_camera("CAMERA_JAPAN_CITY", (-205, -112, 52), (-151, -37, 3), 55)
    shrine_camera = base.create_camera("CAMERA_JAPAN_SHRINE", (126, 6, 52), (181, 55, 4), 54)
    scene = bpy.context.scene
    if os.environ.get("NIMBU_SKIP_RENDERS") != "1":
        for camera, filename in (
            (gameplay_camera, "nimbu_japan_gameplay.png"),
            (overview_camera, "nimbu_japan_overview.png"),
            (city_camera, "nimbu_japan_city.png"),
            (shrine_camera, "nimbu_japan_shrine.png"),
        ):
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
    print("NIMBU_JAPAN_COMPLETE", BLEND_PATH, GLB_PATH, json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    build()
