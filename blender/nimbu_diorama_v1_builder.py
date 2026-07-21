import bpy
import json
import math
import os
import random
from mathutils import Vector


ROOT = "/Users/rehaanr/Documents/openai"
BLENDER_DIR = os.path.join(ROOT, "blender")
OUTPUT_DIR = os.path.join(BLENDER_DIR, "output")
BLEND_PATH = os.path.join(BLENDER_DIR, "nimbu_diorama_v1.blend")
GLB_PATH = os.path.join(ROOT, "public", "assets", "nimbu_diorama_v1.glb")
REPORT_PATH = os.path.join(OUTPUT_DIR, "nimbu_diorama_v1_report.json")
FONT_PATH = "/System/Library/Fonts/Supplemental/Devanagari Sangam MN.ttc"

random.seed(20260720)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(os.path.dirname(GLB_PATH), exist_ok=True)


PALETTE = {
    "sky": (0.34, 0.72, 0.78, 1),
    "grass": (0.37, 0.57, 0.23, 1),
    "grass_light": (0.55, 0.69, 0.28, 1),
    "grass_dark": (0.12, 0.34, 0.17, 1),
    "earth": (0.66, 0.35, 0.18, 1),
    "earth_light": (0.80, 0.55, 0.28, 1),
    "road": (0.83, 0.75, 0.57, 1),
    "road_light": (0.94, 0.87, 0.69, 1),
    "stone": (0.52, 0.53, 0.46, 1),
    "stone_light": (0.77, 0.76, 0.64, 1),
    "ink": (0.055, 0.075, 0.075, 1),
    "cream": (0.94, 0.88, 0.70, 1),
    "white": (0.97, 0.95, 0.86, 1),
    "teal": (0.05, 0.55, 0.54, 1),
    "teal_dark": (0.03, 0.28, 0.30, 1),
    "blue": (0.12, 0.40, 0.62, 1),
    "yellow": (0.97, 0.67, 0.12, 1),
    "saffron": (0.95, 0.37, 0.09, 1),
    "coral": (0.81, 0.27, 0.20, 1),
    "pink": (0.87, 0.45, 0.56, 1),
    "purple": (0.35, 0.23, 0.48, 1),
    "wood": (0.43, 0.24, 0.12, 1),
    "rail": (0.16, 0.19, 0.18, 1),
    "water": (0.08, 0.62, 0.76, 1),
    "skin": (0.55, 0.30, 0.18, 1),
    "shirt": (0.03, 0.62, 0.62, 1),
    "pants": (0.04, 0.16, 0.23, 1),
}


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    # Materials are created once at module load and intentionally survive this reset.
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.cameras, bpy.data.lights):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def make_collection(name):
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    return collection


def move_to_collection(obj, collection):
    for linked in list(obj.users_collection):
        linked.objects.unlink(obj)
    collection.objects.link(obj)


def material(name, color, roughness=0.88, metallic=0.0):
    mat = bpy.data.materials.new("Diorama_" + name)
    mat.diffuse_color = color
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat


MATS = {name: material(name, color) for name, color in PALETTE.items()}
MATS["water"] = material("water", PALETTE["water"], 0.26, 0.03)
MATS["rail"] = material("rail", PALETTE["rail"], 0.48, 0.42)


def empty(name, location=(0, 0, 0), parent=None, collection=None):
    obj = bpy.data.objects.new(name, None)
    if collection is None:
        collection = parent.users_collection[0]
    collection.objects.link(obj)
    obj.location = location
    if parent is not None:
        obj.parent = parent
    return obj


def add_bevel(obj, width=0.08, segments=2):
    if width <= 0:
        return
    modifier = obj.modifiers.new("Soft toy edges", "BEVEL")
    modifier.width = width
    modifier.segments = segments


def box(parent, name, location, dimensions, mat, bevel=0.06, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    add_bevel(obj, min(bevel, min(dimensions) * 0.18), 2)
    obj.data.materials.append(mat)
    obj.parent = parent
    move_to_collection(obj, parent.users_collection[0])
    return obj


def cylinder(parent, name, location, radius, depth, mat, vertices=12, rotation=(0, 0, 0), bevel=0.04):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    add_bevel(obj, bevel, 2)
    obj.parent = parent
    move_to_collection(obj, parent.users_collection[0])
    return obj


def ico(parent, name, location, radius, mat, subdivisions=1, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=radius, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    obj.parent = parent
    move_to_collection(obj, parent.users_collection[0])
    return obj


def terrain_height(x, y):
    undulation = math.sin(x * 0.075) * 0.30 + math.cos(y * 0.095) * 0.26
    valley = -math.exp(-((x - 8.0) ** 2 + (y - 18.0) ** 2) / 1050.0) * 0.72
    mountain_rise = max(0.0, (x + y - 62.0) * 0.075)
    northern_rise = max(0.0, (y - 48.0) * 0.045)
    station_flatten = math.exp(-((x + 76.0) ** 2 + (y + 42.0) ** 2) / 260.0)
    return (undulation + valley) * (1.0 - station_flatten * 0.72) + mountain_rise + northern_rise


def create_terrain(root, collection):
    cols, rows = 72, 54
    min_x, max_x = -100.0, 100.0
    min_y, max_y = -75.0, 75.0
    vertices = []
    for row in range(rows + 1):
        y = min_y + (max_y - min_y) * row / rows
        for col in range(cols + 1):
            x = min_x + (max_x - min_x) * col / cols
            edge = max(abs(x) / max_x, abs(y) / max_y)
            z = terrain_height(x, y) - max(0.0, edge - 0.91) * 13.0
            vertices.append((x, y, z))
    faces = []
    for row in range(rows):
        for col in range(cols):
            a = row * (cols + 1) + col
            b = a + 1
            c = a + cols + 1
            d = c + 1
            if (row + col) % 2:
                faces.extend(((a, b, c), (b, d, c)))
            else:
                faces.extend(((a, b, d), (a, d, c)))
    mesh = bpy.data.meshes.new("Nimbu_diorama_terrain_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new("WALKABLE_DI0RAMA_TERRAIN", mesh)
    collection.objects.link(obj)
    obj.parent = root
    obj.data.materials.append(MATS["grass"])
    obj["walkable"] = True
    return obj


def sample_path(points, steps_per_segment=9):
    samples = []
    for index in range(len(points) - 1):
        a = Vector(points[index])
        b = Vector(points[index + 1])
        for step in range(steps_per_segment):
            t = step / steps_per_segment
            eased = t * t * (3.0 - 2.0 * t)
            point = a.lerp(b, eased)
            samples.append((point.x, point.y))
    samples.append(tuple(points[-1]))
    return samples


def offset_path(points, offset):
    result = []
    for index, point in enumerate(points):
        previous = Vector(points[max(0, index - 1)])
        following = Vector(points[min(len(points) - 1, index + 1)])
        tangent = (following - previous).normalized()
        side = Vector((-tangent.y, tangent.x))
        shifted = Vector(point) + side * offset
        result.append((shifted.x, shifted.y))
    return result


def create_ribbon(root, name, points, width, mat, collection, lift=0.06, walkable=True):
    vertices = []
    faces = []
    for index, point in enumerate(points):
        previous = Vector(points[max(0, index - 1)])
        following = Vector(points[min(len(points) - 1, index + 1)])
        tangent = (following - previous).normalized()
        side = Vector((-tangent.y, tangent.x))
        center = Vector((point[0], point[1], terrain_height(point[0], point[1]) + lift))
        left = center + Vector((side.x, side.y, 0)) * width * 0.5
        right = center - Vector((side.x, side.y, 0)) * width * 0.5
        vertices.extend((tuple(left), tuple(right)))
        if index:
            base = index * 2
            faces.append((base - 2, base, base + 1, base - 1))
    mesh = bpy.data.meshes.new(name + "_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    obj.parent = root
    obj.data.materials.append(mat)
    obj["walkable"] = walkable
    obj["clearance_width"] = width
    return obj


def create_road_network(root, collection):
    road_root = empty("INDIA_VEHICLE_ROAD_NETWORK", (0, 0, 0), root, collection)
    main_controls = [
        (-84, -40), (-74, -36), (-62, -30), (-49, -23), (-35, -14),
        (-20, -5), (-2, 1), (18, 6), (37, 14), (53, 27), (66, 41), (76, 52),
    ]
    main_path = sample_path(main_controls, 10)
    create_ribbon(road_root, "WALKABLE_DI0RAMA_MAIN_ROAD", main_path, 7.0, MATS["road"], collection, 0.075)
    create_ribbon(road_root, "ROAD_DI0RAMA_CENTER_PAINT", main_path, 0.16, MATS["yellow"], collection, 0.105, False)

    bazaar_controls = [(-59, -28), (-59, -18), (-54, -10), (-44, -6), (-34, -8), (-25, -14)]
    bazaar_path = sample_path(bazaar_controls, 8)
    create_ribbon(road_root, "WALKABLE_DI0RAMA_BAZAAR_LANE", bazaar_path, 5.2, MATS["road_light"], collection, 0.085)

    lake_controls = [(17, 6), (10, 14), (7, 24), (12, 35), (25, 41), (38, 34), (40, 20), (37, 14)]
    lake_path = sample_path(lake_controls, 8)
    create_ribbon(road_root, "WALKABLE_DI0RAMA_LAKE_PROMENADE", lake_path, 4.8, MATS["road_light"], collection, 0.09)

    courtyard_controls = [(53, 27), (57, 36), (63, 45), (71, 54)]
    courtyard_path = sample_path(courtyard_controls, 8)
    create_ribbon(road_root, "WALKABLE_DI0RAMA_TEMPLE_PATH", courtyard_path, 4.4, MATS["stone_light"], collection, 0.09)

    south_controls = [(-62, -30), (-54, -43), (-36, -52), (-12, -57), (14, -53), (37, -40), (50, -21), (45, -2), (37, 14)]
    south_path = sample_path(south_controls, 9)
    create_ribbon(road_root, "WALKABLE_DI0RAMA_SOUTHERN_LOOP", south_path, 6.4, MATS["earth_light"], collection, 0.08)
    create_ribbon(road_root, "ROAD_DI0RAMA_SOUTH_PAINT", south_path, 0.12, MATS["cream"], collection, 0.11, False)

    route = empty("ROAD_ROUTE_WAYPOINTS", (0, 0, 0), road_root, collection)
    for index, (x, y) in enumerate(main_controls):
        point = empty(f"ROAD_ROUTE_{index:02d}", (x, y, terrain_height(x, y) + 0.15), route, collection)
        point["route_index"] = index

    return {
        "main": main_path,
        "bazaar": bazaar_path,
        "lake": lake_path,
        "temple": courtyard_path,
        "south": south_path,
    }


def add_window(parent, name, x, y, z, mat=MATS["teal_dark"]):
    box(parent, name + "_trim", (x, y, z), (0.92, 0.16, 1.08), MATS["cream"], 0.04)
    box(parent, name + "_glass", (x, y - 0.10, z), (0.68, 0.055, 0.80), mat, 0.025)
    box(parent, name + "_cross", (x, y - 0.14, z), (0.055, 0.035, 0.78), MATS["cream"], 0.01)


def create_building(root, collection, spec, obstacle_specs):
    x, y = spec["position"]
    width, depth = spec["size"]
    floors = spec.get("floors", 1)
    height = floors * 2.65
    parent = empty("OBSTACLE_" + spec["name"], (x, y, terrain_height(x, y)), root, collection)
    parent["obstacle_radius"] = max(width, depth) * 0.56
    obstacle_specs.append((parent.name, Vector((x, y)), max(width, depth) * 0.56))
    box(parent, spec["name"] + "_body", (0, 0, height * 0.5), (width, depth, height), MATS[spec["wall"]], 0.14)
    box(parent, spec["name"] + "_foundation", (0, 0, 0.18), (width + 0.34, depth + 0.34, 0.36), MATS["stone"], 0.07)
    roof_mat = MATS[spec.get("roof", "teal")]
    box(parent, spec["name"] + "_roof", (0, 0, height + 0.28), (width + 0.62, depth + 0.62, 0.42), roof_mat, 0.11)
    front_y = -depth * 0.51
    box(parent, spec["name"] + "_door", (0, front_y, 1.05), (0.92, 0.18, 2.04), MATS["wood"], 0.05)
    for floor in range(floors):
        z = 1.45 + floor * 2.55
        for side in (-1, 1):
            add_window(parent, f"{spec['name']}_window_{floor}_{side}", side * width * 0.28, front_y, z)
    awning = spec.get("awning")
    if awning:
        box(parent, spec["name"] + "_awning", (0, front_y - 0.55, 2.15), (width * 0.82, 1.15, 0.18), MATS[awning], 0.05, (math.radians(-8), 0, 0))
    return parent


def text_mesh(parent, name, body, location, size, mat, rotation=(math.radians(90), 0, 0), align="CENTER"):
    bpy.ops.object.text_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.body = body
    obj.data.align_x = align
    obj.data.align_y = "CENTER"
    obj.data.size = size
    # Sign lettering is viewed from several metres away. Low curve resolution
    # keeps the converted mesh crisp while avoiding tens of megabytes of
    # invisible bevel tessellation across the open world.
    obj.data.resolution_u = 2
    obj.data.bevel_resolution = 0
    obj.data.extrude = 0.012
    obj.data.bevel_depth = 0.002
    if os.path.exists(FONT_PATH):
        try:
            obj.data.font = bpy.data.fonts.load(FONT_PATH, check_existing=True)
        except Exception:
            pass
    obj.data.materials.append(mat)
    obj.parent = parent
    move_to_collection(obj, parent.users_collection[0])
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj.select_set(False)
    return obj


def create_station(root, collection, obstacle_specs):
    station = create_building(root, collection, {
        "name": "NIMBU_ROAD_STATION", "position": (-76, -50.0), "size": (14, 7.0),
        "floors": 1, "wall": "cream", "roof": "teal", "awning": "yellow",
    }, obstacle_specs)
    text_mesh(station, "Station_sign_english", "NIMBU ROAD", (0, -3.66, 2.58), 0.72, MATS["ink"])
    text_mesh(station, "Station_sign_hindi", "निम्बू रोड", (0, -3.70, 1.86), 0.54, MATS["coral"])
    platform = empty("OBSTACLE_STATION_PLATFORM_EDGE", (0, 0, 0), root, collection)
    box(platform, "STATION_PLATFORM", (-70, -58.0, terrain_height(-70, -58.0) + 0.38), (48, 4.2, 0.68), MATS["stone_light"], 0.08)
    obstacle_specs.append((platform.name, Vector((-70, -58.0)), 0.0))

    sign = empty("INTERACT_STATION_BOARD", (-78.0, -42.0, terrain_height(-78.0, -42.0)), root, collection)
    sign["prompt"] = "Read the station phrase"
    sign["action"] = "station_phrase"
    sign["dialogue_hi"] = "नमस्ते, स्टेशन कहाँ है?"
    sign["dialogue_en"] = "Hello, where is the station?"
    box(sign, "Station_phrase_board", (0, 0, 1.55), (3.6, 0.22, 2.35), MATS["teal_dark"], 0.11)
    text_mesh(sign, "Station_phrase_text", "स्टेशन कहाँ है?", (0, -0.16, 1.62), 0.42, MATS["white"])


def create_bazaar(root, collection, obstacle_specs):
    specs = [
        {"name": "POST_OFFICE", "position": (-67.5, -18.0), "size": (7.2, 5.5), "floors": 2, "wall": "coral", "roof": "cream", "awning": "yellow"},
        {"name": "BLUE_TAILOR", "position": (-55, 0.0), "size": (6.4, 5.1), "floors": 1, "wall": "blue", "roof": "cream", "awning": "pink"},
        {"name": "SPICE_SHOP", "position": (-43, 1.0), "size": (6.2, 5.2), "floors": 2, "wall": "yellow", "roof": "teal", "awning": "saffron"},
        {"name": "GREEN_LODGE", "position": (-31, -1.0), "size": (7.0, 5.7), "floors": 2, "wall": "teal", "roof": "cream", "awning": "coral"},
        {"name": "BOOK_SHOP", "position": (-18, -24.0), "size": (6.5, 5.2), "floors": 1, "wall": "pink", "roof": "teal_dark", "awning": "yellow"},
    ]
    for spec in specs:
        create_building(root, collection, spec, obstacle_specs)

    chai = empty("OBSTACLE_CHAI_CART", (-35.0, 7.0, terrain_height(-35.0, 7.0)), root, collection)
    chai["obstacle_radius"] = 1.55
    obstacle_specs.append((chai.name, Vector((-35.0, 7.0)), 1.55))
    box(chai, "Chai_cart_body", (0, 0, 0.85), (2.7, 1.45, 1.6), MATS["teal_dark"], 0.12)
    box(chai, "Chai_cart_counter", (0, -0.74, 1.54), (3.0, 0.45, 0.22), MATS["wood"], 0.06)
    box(chai, "Chai_cart_roof", (0, 0, 2.55), (3.5, 2.15, 0.24), MATS["yellow"], 0.08)
    for index in range(4):
        cylinder(chai, f"Chai_cup_{index}", (-0.72 + index * 0.48, -0.96, 1.82), 0.13, 0.25, MATS["cream"], 10)
    cylinder(chai, "Chai_kettle", (0.83, -0.92, 1.90), 0.32, 0.48, MATS["rail"], 12)

    interaction = empty("INTERACT_CHAI_VENDOR", (-35.0, 4.7, terrain_height(-35.0, 4.7)), root, collection)
    interaction["prompt"] = "Order chai in Hindi"
    interaction["action"] = "chai_phrase"
    interaction["dialogue_hi"] = "नमस्ते! एक चाय, कृपया।"
    interaction["dialogue_en"] = "Hello! One tea, please."

    npc = empty("NPC_CHAIWALA", (-35.0, 6.25, terrain_height(-35.0, 6.25)), root, collection)
    cylinder(npc, "Chaiwala_body", (0, 0, 1.05), 0.42, 1.55, MATS["saffron"], 10)
    ico(npc, "Chaiwala_head", (0, 0, 2.05), 0.44, MATS["skin"], 2, (0.92, 0.85, 1.05))
    box(npc, "Chaiwala_moustache", (0, -0.40, 1.98), (0.42, 0.08, 0.09), MATS["ink"], 0.03)
    cylinder(npc, "Chaiwala_cap", (0, 0, 2.46), 0.44, 0.16, MATS["white"], 10)

    fruit = empty("INTERACT_FRUIT_VENDOR", (-53.0, -7.0, terrain_height(-53.0, -7.0)), root, collection)
    fruit["prompt"] = "Ask the price of mangoes"
    fruit["action"] = "fruit_phrase"
    fruit["dialogue_hi"] = "आम कितने के हैं?"
    fruit["dialogue_en"] = "How much are the mangoes?"
    box(fruit, "Fruit_stall_counter", (0, 0, 0.82), (2.8, 1.25, 1.45), MATS["wood"], 0.10)
    box(fruit, "Fruit_stall_roof", (0, 0, 2.45), (3.4, 2.1, 0.22), MATS["pink"], 0.08)
    for index in range(9):
        ico(fruit, f"Fruit_mango_{index}", (-0.85 + (index % 3) * 0.85, -0.68, 1.52 + (index // 3) * 0.22), 0.16, MATS["yellow"], 1, (1.0, 0.8, 1.18))


def create_lake_surface(root, collection):
    cx, cy = 22.0, 25.0
    rx, ry = 12.5, 8.8
    water_z = terrain_height(cx, cy) + 0.16
    vertices = [(cx, cy, water_z)]
    segments = 40
    for index in range(segments):
        angle = index * math.tau / segments
        ripple = 1.0 + math.sin(angle * 5) * 0.035
        vertices.append((cx + math.cos(angle) * rx * ripple, cy + math.sin(angle) * ry * ripple, water_z))
    faces = []
    for index in range(segments):
        faces.append((0, 1 + index, 1 + ((index + 1) % segments)))
    mesh = bpy.data.meshes.new("Jheel_water_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    water = bpy.data.objects.new("SCENERY_JHEEL_WATER", mesh)
    collection.objects.link(water)
    water.parent = root
    water.data.materials.append(MATS["water"])

    island = empty("SCENERY_JHEEL_ISLAND", (cx, cy, water_z + 0.12), root, collection)
    cylinder(island, "Jheel_island_ground", (0, 0, 0), 3.0, 0.42, MATS["stone_light"], 16)
    shrine = empty("JHEEL_ISLAND_SHRINE", (0, 0, 0.22), island, collection)
    for side in (-1, 1):
        cylinder(shrine, f"Island_shrine_column_{side}", (side * 1.05, 0, 1.45), 0.22, 2.5, MATS["cream"], 9)
    box(shrine, "Island_shrine_roof", (0, 0, 2.85), (3.6, 3.0, 0.32), MATS["saffron"], 0.10)
    cylinder(shrine, "Island_shrine_finial", (0, 0, 3.45), 0.18, 0.82, MATS["yellow"], 8)

    bridge_points = sample_path([(8.5, 23.0), (13.0, 23.8), (17.5, 24.5), (20.0, 25.0)], 4)
    bridge = create_ribbon(root, "WALKABLE_DI0RAMA_LAKE_BRIDGE", bridge_points, 2.4, MATS["wood"], collection, 0.48)
    bridge["walkable"] = True
    return (cx, cy, rx, ry)


def create_lake_city(root, collection, obstacle_specs):
    specs = [
        {"name": "JHEEL_DHABA", "position": (-2, 30), "size": (7.0, 5.4), "floors": 1, "wall": "yellow", "roof": "teal", "awning": "coral"},
        {"name": "HINDI_SCHOOL", "position": (5, 44), "size": (8.2, 6.2), "floors": 2, "wall": "cream", "roof": "blue", "awning": "yellow"},
        {"name": "LAKE_LODGE", "position": (27, 49), "size": (8.0, 6.0), "floors": 2, "wall": "teal", "roof": "cream", "awning": "pink"},
        {"name": "GHAT_HOUSE", "position": (46, 37), "size": (7.2, 5.6), "floors": 1, "wall": "coral", "roof": "teal_dark", "awning": "yellow"},
        {"name": "BOAT_WORKSHOP", "position": (-4, 18), "size": (6.8, 5.4), "floors": 1, "wall": "blue", "roof": "cream", "awning": "saffron"},
    ]
    for spec in specs:
        create_building(root, collection, spec, obstacle_specs)

    ghat = empty("SCENERY_JHEEL_GHAT", (8.0, 23.0, terrain_height(8.0, 23.0)), root, collection)
    for step in range(5):
        box(ghat, f"Jheel_ghat_step_{step}", (step * 0.55, 0, 0.12 - step * 0.10), (1.2, 5.4, 0.24), MATS["stone_light"], 0.04)

    boatman = empty("INTERACT_BOATMAN", (7.0, 19.5, terrain_height(7.0, 19.5)), root, collection)
    boatman["prompt"] = "Ask for a boat ride"
    boatman["action"] = "boat_phrase"
    boatman["dialogue_hi"] = "नाव की सवारी कितनी है?"
    boatman["dialogue_en"] = "How much is the boat ride?"
    cylinder(boatman, "Boatman_body", (0, 0, 1.0), 0.38, 1.45, MATS["blue"], 10)
    ico(boatman, "Boatman_head", (0, 0, 1.95), 0.42, MATS["skin"], 2)
    cylinder(boatman, "Boatman_cap", (0, 0, 2.34), 0.40, 0.14, MATS["white"], 10)


def create_pahadi_rail_city(root, collection, obstacle_specs):
    specs = [
        {"name": "PAHADI_SCHOOL", "position": (49, 49), "size": (8.0, 6.1), "floors": 2, "wall": "cream", "roof": "coral", "awning": "yellow"},
        {"name": "CEDAR_GUESTHOUSE", "position": (57, 61), "size": (7.4, 5.8), "floors": 2, "wall": "teal", "roof": "cream", "awning": "pink"},
        {"name": "PAHADI_RAIL_STATION", "position": (85, 49), "size": (10.0, 6.2), "floors": 1, "wall": "yellow", "roof": "teal_dark", "awning": "coral"},
        {"name": "MOUNTAIN_POST", "position": (48, 63), "size": (6.2, 5.0), "floors": 1, "wall": "blue", "roof": "cream", "awning": "yellow"},
        {"name": "SUMMIT_HOUSE", "position": (71, 70), "size": (7.0, 5.5), "floors": 2, "wall": "pink", "roof": "teal", "awning": "cream"},
    ]
    for spec in specs:
        create_building(root, collection, spec, obstacle_specs)

    sign = empty("INTERACT_PAHADI_STATION", (78.0, 46.0, terrain_height(78.0, 46.0)), root, collection)
    sign["prompt"] = "Ask when the train arrives"
    sign["action"] = "train_phrase"
    sign["dialogue_hi"] = "ट्रेन कब आएगी?"
    sign["dialogue_en"] = "When will the train arrive?"
    box(sign, "Pahadi_station_board", (0, 0, 1.55), (3.8, 0.22, 2.3), MATS["teal_dark"], 0.10)
    text_mesh(sign, "Pahadi_station_text", "ट्रेन कब आएगी?", (0, -0.16, 1.62), 0.38, MATS["white"])


def create_temple(root, collection, obstacle_specs):
    x, y = 80.0, 62.0
    temple = empty("OBSTACLE_HILL_TEMPLE", (x, y, terrain_height(x, y)), root, collection)
    temple["obstacle_radius"] = 4.0
    obstacle_specs.append((temple.name, Vector((x, y)), 4.0))
    for level in range(3):
        size = 7.2 - level * 1.25
        box(temple, f"Temple_step_{level}", (0, 0, 0.22 + level * 0.36), (size, size, 0.42), MATS["stone_light"], 0.07)
    for px in (-2.0, 2.0):
        for py in (-2.0, 2.0):
            cylinder(temple, f"Temple_column_{px}_{py}", (px, py, 2.35), 0.30, 3.6, MATS["cream"], 10)
    box(temple, "Temple_roof", (0, 0, 4.35), (6.2, 6.2, 0.42), MATS["saffron"], 0.12)
    for level in range(4):
        cylinder(temple, f"Temple_shikhara_{level}", (0, 0, 4.75 + level * 0.55), 1.65 - level * 0.28, 0.62, MATS["cream"], 8)
    cylinder(temple, "Temple_finial", (0, 0, 7.05), 0.26, 0.95, MATS["yellow"], 8)

    bell_root = empty("INTERACT_TEMPLE_BELL", (70.0, 52.0, terrain_height(70.0, 52.0)), root, collection)
    bell_root["prompt"] = "Ring the temple bell"
    bell_root["action"] = "ring_bell"
    bell_root["dialogue_hi"] = "मंदिर की घंटी"
    bell_root["dialogue_en"] = "The temple bell"
    box(bell_root, "Bell_frame_top", (0, 0, 2.85), (3.2, 0.34, 0.34), MATS["wood"], 0.07)
    for side in (-1, 1):
        box(bell_root, f"Bell_frame_{side}", (side * 1.35, 0, 1.45), (0.32, 0.32, 3.0), MATS["wood"], 0.07)
    bell_pivot = empty("TEMPLE_BELL_PIVOT", (0, 0, 2.55), bell_root, collection)
    cylinder(bell_pivot, "Temple_bell", (0, 0, -0.45), 0.48, 0.70, MATS["yellow"], 12)
    cylinder(bell_pivot, "Temple_bell_clapper", (0, 0, -0.92), 0.12, 0.46, MATS["rail"], 8)


def create_track_and_train(root, collection):
    track = empty("RAILWAY_CORRIDOR", (0, 0, 0), root, collection)
    route_controls = [
        (-108, -63), (-84, -62), (-58, -59), (-30, -55), (0, -48),
        (28, -36), (49, -19), (63, 3), (72, 27), (79, 49), (91, 66), (108, 70),
    ]
    track_path = sample_path(route_controls, 9)
    for side in (-1, 1):
        create_ribbon(track, f"RAIL_TRACK_{side}", offset_path(track_path, side * 0.92), 0.16, MATS["rail"], collection, 0.48, False)
    for index in range(0, len(track_path), 3):
        point = Vector(track_path[index])
        previous = Vector(track_path[max(0, index - 1)])
        following = Vector(track_path[min(len(track_path) - 1, index + 1)])
        tangent = (following - previous).normalized()
        angle = math.atan2(tangent.y, tangent.x)
        box(
            track,
            f"Sleeper_{index:03d}",
            (point.x, point.y, terrain_height(point.x, point.y) + 0.35),
            (0.34, 2.7, 0.18),
            MATS["wood"],
            0.025,
            (0, 0, angle),
        )

    route = empty("TRAIN_ROUTE_WAYPOINTS", (0, 0, 0), root, collection)
    for index, (x, y) in enumerate(route_controls):
        point = empty(f"TRAIN_ROUTE_{index:02d}", (x, y, terrain_height(x, y) + 1.0), route, collection)
        point["route_index"] = index

    start_x, start_y = route_controls[0]
    train = empty("TOY_TRAIN", (start_x, start_y, terrain_height(start_x, start_y) + 1.0), root, collection)
    for car_index in range(3):
        car = empty(f"Train_car_{car_index}", (-car_index * 4.9, 0, 0), train, collection)
        color = ("coral", "teal", "yellow")[car_index]
        box(car, f"Train_car_body_{car_index}", (0, 0, 1.20), (4.25, 2.15, 1.9), MATS[color], 0.24)
        box(car, f"Train_car_roof_{car_index}", (0, 0, 2.30), (4.55, 2.36, 0.32), MATS["cream"], 0.14)
        for side in (-1, 1):
            for axle in (-1.35, 1.35):
                cylinder(car, f"Train_wheel_{car_index}_{side}_{axle}", (axle, side * 1.02, 0.36), 0.46, 0.22, MATS["rail"], 12, (math.radians(90), 0, 0))
    cylinder(train, "Train_engine_stack", (1.1, 0, 3.05), 0.30, 1.02, MATS["rail"], 10)


def create_tree(root, collection, name, x, y, scale=1.0, blossom=False):
    z = terrain_height(x, y)
    tree = empty(name, (x, y, z), root, collection)
    cylinder(tree, name + "_trunk", (0, 0, 1.4 * scale), 0.28 * scale, 2.8 * scale, MATS["wood"], 9)
    colors = ["grass_dark", "grass", "grass_light"]
    if blossom:
        colors[2] = "pink"
    for index, (ox, oy, oz, radius) in enumerate((
        (0, 0, 3.0, 1.35), (-0.75, 0.15, 2.75, 0.92), (0.72, -0.1, 2.8, 0.96), (0.1, 0.1, 3.9, 0.92),
    )):
        leaf = ico(tree, f"ANIM_WIND_{name}_leaf_{index}", (ox * scale, oy * scale, oz * scale), radius * scale, MATS[colors[index % 3]], 1, (1.0, 0.88, 1.12))
        leaf["wind_phase"] = index * 0.72 + x * 0.13
    return tree


def create_scenery(root, collection, protected_paths, obstacle_specs):
    tree_positions = [
        (-93, -28, 1.25, False), (-88, -4, 1.0, True), (-79, 18, 1.2, False),
        (-68, 34, 1.1, True), (-49, 30, 1.3, False), (-31, 37, 1.0, True),
        (-16, 57, 1.3, False), (4, 61, 1.15, True), (23, 63, 1.25, False),
        (42, 60, 1.15, False), (62, 68, 1.2, True), (91, 30, 1.3, False),
        (93, 4, 1.1, True), (89, -27, 1.3, False), (71, -47, 1.25, False),
        (48, -58, 1.1, True), (20, -66, 1.2, False), (-8, -66, 1.15, True),
        (-36, -65, 1.2, False), (-66, -64, 1.1, False),
    ]
    all_path_points = [point for path in protected_paths.values() for point in path]
    attempts = 0
    while len(tree_positions) < 52 and attempts < 500:
        attempts += 1
        x = random.uniform(-92, 92)
        y = random.uniform(-68, 68)
        point = Vector((x, y))
        if min((point - Vector(path_point)).length for path_point in all_path_points) < 6.0:
            continue
        if ((x - 22.0) / 16.0) ** 2 + ((y - 25.0) / 12.0) ** 2 < 1.0:
            continue
        if any((point - center).length < radius + 3.2 for _, center, radius in obstacle_specs if radius > 0):
            continue
        tree_positions.append((x, y, random.uniform(0.88, 1.28), random.random() < 0.22))
    for index, (x, y, scale, blossom) in enumerate(tree_positions):
        create_tree(root, collection, f"SCENERY_TREE_{index:02d}", x, y, scale, blossom)

    hills = empty("BACKGROUND_HIMALAYAN_HILLS", (0, 0, 0), root, collection)
    for index, (x, y, sx, sy, sz) in enumerate((
        (-96, 61, 15, 8, 15), (-77, 72, 18, 10, 20), (-49, 76, 20, 11, 24),
        (-20, 79, 22, 12, 27), (12, 80, 23, 12, 30), (45, 78, 21, 11, 27),
        (76, 73, 19, 10, 22), (98, 59, 16, 9, 17), (103, 19, 12, 17, 16),
        (-104, 22, 12, 17, 17),
    )):
        ico(hills, f"BACKGROUND_HILL_{index:02d}", (x, y, terrain_height(x, y) + sz * 0.34), 1.0, MATS["earth_light"], 2, (sx, sy, sz))
        ico(hills, f"BACKGROUND_HILL_GREEN_{index:02d}", (x, y - 0.4, terrain_height(x, y) + sz * 0.56), 1.0, MATS["grass_dark"], 2, (sx * 0.72, sy * 0.75, sz * 0.56))

    stream_points = sample_path([(65, 72), (57, 57), (51, 43), (43, 35), (34, 29)], 10)
    create_ribbon(root, "SCENERY_MOUNTAIN_STREAM", stream_points, 3.2, MATS["water"], collection, 0.12, False)

    for line_index, y in enumerate((-18.0, -6.0, 34.0, 52.0)):
        line = empty(f"BUNTING_LINE_{line_index}", (0, 0, 0), root, collection)
        for flag_index in range(12):
            x_start = -62 if line_index < 2 else (0 if line_index == 2 else 51)
            x = x_start + flag_index * 2.3
            flag = box(line, f"ANIM_WIND_FLAG_{line_index}_{flag_index}", (x, y, 5.4 + math.sin(flag_index * 0.7) * 0.18), (0.72, 0.08, 0.86), MATS[("yellow", "coral", "teal", "pink")[flag_index % 4]], 0.02, (0, 0, math.radians(7 if flag_index % 2 else -7)))
            flag["wind_phase"] = flag_index * 0.55

    terraces = empty("SCENERY_TERRACED_FIELDS", (0, 0, 0), root, collection)
    for field_index, (x, y, width) in enumerate((
        (-79, 8, 20), (-68, 15, 18), (-51, 22, 20), (-31, 26, 17),
        (-75, -28, 13), (-40, -39, 18), (-9, -42, 20), (22, -37, 18),
    )):
        for strip in range(4):
            box(
                terraces,
                f"Field_{field_index}_{strip}",
                (x, y + strip * 1.55, terrain_height(x, y + strip * 1.55) + 0.10),
                (width - strip * 1.1, 1.05, 0.18),
                MATS[("grass_light", "earth_light")[strip % 2]],
                0.04,
            )


def create_physics_props(root, collection):
    ball_root = empty("PHYSICS_FOOTBALL", (-27.0, -8.0, terrain_height(-27.0, -8.0) + 0.62), root, collection)
    ball_root["physics_radius"] = 0.55
    ico(ball_root, "Football_mesh", (0, 0, 0), 0.55, MATS["white"], 2)
    for index in range(5):
        angle = index * math.tau / 5
        ico(ball_root, f"Football_patch_{index}", (math.cos(angle) * 0.46, math.sin(angle) * 0.46, 0.06), 0.15, MATS["ink"], 1, (1, 1, 0.35))

    for index, (x, y) in enumerate(((-68.0, -40.5), (-66.8, -40.1), (-67.5, -39.2))):
        crate = empty(f"PHYSICS_LUGGAGE_{index}", (x, y, terrain_height(x, y) + 0.45), root, collection)
        crate["physics_radius"] = 0.48
        box(crate, f"Luggage_mesh_{index}", (0, 0, 0), (0.82, 0.62, 0.88), MATS[("coral", "teal", "yellow")[index]], 0.12)


def create_character(root, collection):
    x, y = -81.0, -39.0
    player = empty("PLAYER_RIG_DIORAMA", (x, y, terrain_height(x, y) + 0.08), root, collection)
    player["spawn_heading_x"] = 0.92
    player["spawn_heading_z"] = -0.38
    visual = empty("PLAYER_VISUAL", (0, 0, 0), player, collection)
    cylinder(visual, "Player_torso", (0, 0, 1.55), 0.42, 1.18, MATS["shirt"], 10)
    ico(visual, "Player_head", (0, 0, 2.45), 0.48, MATS["skin"], 2, (0.92, 0.88, 1.05))
    for index in range(5):
        angle = -0.95 + index * 0.47
        ico(visual, f"Player_hair_{index}", (math.sin(angle) * 0.33, 0.02, 2.82 + math.cos(angle) * 0.16), 0.25, MATS["ink"], 1, (0.75, 0.72, 1.25))
    box(visual, "Player_backpack", (0, 0.37, 1.57), (0.78, 0.34, 1.0), MATS["purple"], 0.14)
    for side in (-1, 1):
        leg = empty(f"Player_leg_{side}", (side * 0.23, 0, 1.02), visual, collection)
        cylinder(leg, f"Player_leg_mesh_{side}", (0, 0, -0.45), 0.18, 0.94, MATS["pants"], 9)
        box(leg, f"Player_shoe_{side}", (0, -0.11, -0.98), (0.42, 0.62, 0.25), MATS["yellow"], 0.10)
        arm = empty(f"Player_arm_{side}", (side * 0.47, 0, 1.92), visual, collection)
        cylinder(arm, f"Player_arm_mesh_{side}", (0, 0, -0.42), 0.14, 0.88, MATS["skin"], 9)
    return player


def create_camera(name, location, target, lens=48):
    bpy.ops.object.camera_add(location=location)
    camera = bpy.context.object
    camera.name = name
    camera.data.lens = lens
    direction = Vector(target) - Vector(location)
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    return camera


def configure_render():
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.color = PALETTE["sky"][:3]
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except Exception:
        pass
    scene.render.image_settings.color_mode = "RGBA"


def create_lighting(collection):
    bpy.ops.object.light_add(type="SUN", location=(-18, -24, 42))
    sun = bpy.context.object
    sun.name = "RENDER_SUN"
    sun.data.energy = 3.2
    sun.data.color = (1.0, 0.70, 0.44)
    sun.rotation_euler = (math.radians(28), math.radians(-24), math.radians(-36))
    move_to_collection(sun, collection)

    bpy.ops.object.light_add(type="AREA", location=(-10, -8, 30))
    fill = bpy.context.object
    fill.name = "RENDER_SKY_FILL"
    fill.data.energy = 1200
    fill.data.shape = "DISK"
    fill.data.size = 24
    fill.data.color = (0.55, 0.82, 1.0)
    move_to_collection(fill, collection)


def validate_layout(protected_paths, obstacle_specs):
    building_checks = []
    blocked = []
    all_path_points = [point for path in protected_paths.values() for point in path]
    for name, center, radius in obstacle_specs:
        if radius <= 0:
            continue
        clearance = min((center - Vector(point)).length for point in all_path_points) - radius
        building_checks.append({"name": name, "edge_clearance": round(clearance, 3)})
        if clearance < 3.05 and name not in {"OBSTACLE_CHAI_CART"}:
            blocked.append(name)
    report = {
        "clear": not blocked,
        "blocked": blocked,
        "map_dimensions_m": [200, 150],
        "protected_path_samples": sum(len(path) for path in protected_paths.values()),
        "protected_routes": list(protected_paths.keys()),
        "obstacle_count": len(obstacle_specs),
        "walkable_count": 7,
        "interaction_count": 6,
        "physics_prop_count": 4,
        "districts": ["Namaste Bazaar", "Jheel Mandir", "Pahadi Rail"],
        "building_checks": building_checks,
    }
    with open(REPORT_PATH, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2, ensure_ascii=False)
    if blocked:
        raise RuntimeError("Protected main road blocked by: " + ", ".join(blocked))
    print("NIMBU_DIORAMA_LAYOUT_CLEAR", json.dumps(report))
    return report


def build():
    clear_scene()
    export = make_collection("EXPORT_NIMBU_DIORAMA_V1")
    root = empty("WORLD_NIMBU_DIORAMA", collection=export)
    root["world_style"] = "bruno_inspired_indian_diorama"
    root["gravity_mode"] = "flat"
    root["map_width_m"] = 200
    root["map_depth_m"] = 150

    city_one = empty("CITY_1_NAMASTE_BAZAAR", (0, 0, 0), root, export)
    city_two = empty("CITY_2_JHEEL_MANDIR", (0, 0, 0), root, export)
    city_three = empty("CITY_3_PAHADI_RAIL", (0, 0, 0), root, export)

    create_terrain(root, export)
    protected_paths = create_road_network(root, export)
    obstacle_specs = []
    create_station(city_one, export, obstacle_specs)
    create_bazaar(city_one, export, obstacle_specs)
    create_lake_surface(city_two, export)
    create_lake_city(city_two, export, obstacle_specs)
    create_temple(city_three, export, obstacle_specs)
    create_pahadi_rail_city(city_three, export, obstacle_specs)
    create_track_and_train(root, export)
    create_scenery(root, export, protected_paths, obstacle_specs)
    create_physics_props(root, export)
    create_character(root, export)
    report = validate_layout(protected_paths, obstacle_specs)

    configure_render()
    create_lighting(export)

    gameplay_camera = create_camera(
        "CAMERA_DIORAMA_GAMEPLAY",
        (-93.0, -56.0, 13.8),
        (-65.0, -27.0, 1.8),
        52,
    )
    overview_camera = create_camera(
        "CAMERA_DIORAMA_OVERVIEW",
        (-145.0, -175.0, 164.0),
        (0.0, 0.0, 4.0),
        54,
    )
    bazaar_camera = create_camera(
        "CAMERA_DIORAMA_BAZAAR",
        (-78.0, -54.0, 24.0),
        (-41.0, -10.0, 2.0),
        52,
    )

    scene = bpy.context.scene
    scene.camera = gameplay_camera
    scene.render.filepath = os.path.join(OUTPUT_DIR, "nimbu_diorama_v1_gameplay.png")
    bpy.ops.render.render(write_still=True)
    scene.camera = overview_camera
    scene.render.filepath = os.path.join(OUTPUT_DIR, "nimbu_diorama_v1_overview.png")
    bpy.ops.render.render(write_still=True)
    scene.camera = bazaar_camera
    scene.render.filepath = os.path.join(OUTPUT_DIR, "nimbu_diorama_v1_bazaar.png")
    bpy.ops.render.render(write_still=True)
    lake_camera = create_camera(
        "CAMERA_DIORAMA_LAKE",
        (-18.0, -12.0, 34.0),
        (22.0, 26.0, 1.0),
        54,
    )
    scene.camera = lake_camera
    scene.render.filepath = os.path.join(OUTPUT_DIR, "nimbu_diorama_v1_lake.png")
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
    print("NIMBU_DIORAMA_V1_COMPLETE", BLEND_PATH, GLB_PATH, json.dumps(report))


if __name__ == "__main__":
    build()
