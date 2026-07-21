import bpy
import json
import math
import os
import random
import sys
from mathutils import Vector


ROOT = "/Users/rehaanr/Documents/openai"
BLENDER_DIR = os.path.join(ROOT, "blender")
if BLENDER_DIR not in sys.path:
    sys.path.append(BLENDER_DIR)

import nimbu_india_planet_base_builder as world


BLEND_PATH = os.path.join(BLENDER_DIR, "nimbu_lakeside_village_slice.blend")
OUTPUT_DIR = os.path.join(BLENDER_DIR, "output")
GLB_PATH = os.path.join(ROOT, "public", "assets", "nimbu_lakeside_village_slice.glb")
REPORT_PATH = os.path.join(OUTPUT_DIR, "nimbu_lakeside_village_slice_report.json")
FONT_PATH = "/System/Library/Fonts/Supplemental/Devanagari Sangam MN.ttc"

random.seed(20260719)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(os.path.dirname(GLB_PATH), exist_ok=True)


PALETTE = {
    "sky": (0.20, 0.67, 0.70, 1),
    "grass": (0.22, 0.54, 0.29, 1),
    "grass_light": (0.37, 0.65, 0.34, 1),
    "grass_dark": (0.07, 0.33, 0.20, 1),
    "meadow": (0.57, 0.68, 0.34, 1),
    "earth": (0.58, 0.46, 0.31, 1),
    "earth_light": (0.74, 0.64, 0.47, 1),
    "stone": (0.48, 0.49, 0.42, 1),
    "stone_light": (0.72, 0.70, 0.59, 1),
    "stone_dark": (0.28, 0.34, 0.34, 1),
    "snow": (0.93, 0.95, 0.88, 1),
    "water": (0.12, 0.63, 0.72, 1),
    "water_light": (0.39, 0.85, 0.82, 1),
    "paper": (0.90, 0.87, 0.73, 1),
    "plaster": (0.83, 0.82, 0.70, 1),
    "plaster_blue": (0.60, 0.75, 0.72, 1),
    "plaster_yellow": (0.88, 0.72, 0.41, 1),
    "plaster_coral": (0.76, 0.45, 0.34, 1),
    "teal": (0.08, 0.53, 0.52, 1),
    "teal_dark": (0.035, 0.25, 0.29, 1),
    "blue": (0.12, 0.42, 0.56, 1),
    "saffron": (0.94, 0.45, 0.08, 1),
    "yellow": (0.96, 0.68, 0.14, 1),
    "coral": (0.78, 0.24, 0.16, 1),
    "pink": (0.78, 0.43, 0.53, 1),
    "wood": (0.45, 0.29, 0.16, 1),
    "ink": (0.035, 0.075, 0.085, 1),
    "glass": (0.09, 0.29, 0.34, 1),
    "skin": (0.57, 0.33, 0.23, 1),
    "shirt": (0.04, 0.52, 0.56, 1),
    "pants": (0.05, 0.17, 0.24, 1),
    "white": (0.96, 0.95, 0.86, 1),
}


def material(name, color, roughness=0.92, metallic=0.0):
    mat = bpy.data.materials.new("Lakeside_" + name)
    mat.diffuse_color = color
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat


MATS = {name: material(name, color) for name, color in PALETTE.items()}
MATS["water"] = material("water", PALETTE["water"], 0.24, 0.02)
MATS["glass"] = material("glass", PALETTE["glass"], 0.28, 0.02)


for key in (
    "grass", "grass_light", "grass_dark", "meadow", "earth", "earth_light",
    "stone", "stone_light", "stone_dark", "snow", "water", "water_light",
    "paper", "saffron", "teal", "ink", "shirt", "pants", "skin",
):
    world.MATS[key] = MATS[key]
world.MATS["trunk"] = MATS["wood"]
world.MATS["gold"] = MATS["yellow"]


VILLAGE_CENTER = world.direction_from_local(world.LAKE_CENTER, -10.0, -2.0)


def local_direction(across, along):
    return world.direction_from_local(VILLAGE_CENTER, across, along)


def street_x(along):
    return math.sin(along * 0.22) * 0.52


def street_direction(along):
    return local_direction(street_x(along), along)


def preferred_away_from(direction, target_direction):
    toward = target_direction - direction * target_direction.dot(direction)
    if toward.length < 0.001:
        return Vector((0, 1, 0))
    return -toward.normalized()


def create_ribbon_edges(path, half_width, target):
    left = world.offset_path(path, -half_width)
    right = world.offset_path(path, half_width)
    world.create_ribbon("WALKABLE_LAKESIDE_STREET_EDGE_L", left, 0.11, MATS["ink"], 0.235, target)
    world.create_ribbon("WALKABLE_LAKESIDE_STREET_EDGE_R", right, 0.11, MATS["ink"], 0.235, target)


def create_street(target):
    path = [street_direction(-13.0 + index * 0.13) for index in range(201)]
    street = world.create_ribbon("WALKABLE_LAKESIDE_MAIN_STREET", path, 3.6, MATS["stone_light"], 0.20, target)
    street["walkable"] = True
    street["clearance_width"] = 3.6
    create_ribbon_edges(path, 1.80, target)

    left_sidewalk = world.offset_path(path, -2.65)
    right_sidewalk = world.offset_path(path, 2.65)
    left_obj = world.create_ribbon("WALKABLE_LAKESIDE_SIDEWALK_L", left_sidewalk, 1.10, MATS["paper"], 0.25, target)
    right_obj = world.create_ribbon("WALKABLE_LAKESIDE_SIDEWALK_R", right_sidewalk, 1.10, MATS["paper"], 0.25, target)
    left_obj["walkable"] = True
    right_obj["walkable"] = True
    create_paver_batch(path, target)
    return path


def create_paver_batch(path, target):
    vertices = []
    faces = []
    for row in range(31):
        along = -12.5 + row * 0.82
        center = street_direction(along)
        tangent_target = street_direction(along + 0.35)
        forward = tangent_target - center * tangent_target.dot(center)
        forward.normalize()
        right = forward.cross(center).normalized()
        for column in (-1, 0, 1):
            offset = column * 0.94 + (0.16 if row % 2 else -0.16)
            paver_direction = (center + right * (offset / world.RADIUS)).normalized()
            normal = paver_direction
            point = world.surface(paver_direction, 0.245)
            tangent_forward = forward - normal * forward.dot(normal)
            tangent_forward.normalize()
            tangent_right = tangent_forward.cross(normal).normalized()
            half_w = 0.33 + 0.04 * math.sin(row * 1.7 + column)
            half_d = 0.25
            start = len(vertices)
            vertices.extend((
                tuple(point - tangent_right * half_w - tangent_forward * half_d),
                tuple(point + tangent_right * half_w - tangent_forward * half_d),
                tuple(point + tangent_right * half_w + tangent_forward * half_d),
                tuple(point - tangent_right * half_w + tangent_forward * half_d),
            ))
            faces.append((start, start + 1, start + 2, start + 3))
    mesh = bpy.data.meshes.new("Lakeside_pavers_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new("BATCH_LAKESIDE_PAVERS", mesh)
    target.objects.link(obj)
    obj.data.materials.append(MATS["earth_light"])


def add_text(parent, name, body, location, size, mat):
    bpy.ops.object.text_add(location=(0, 0, 0))
    obj = bpy.context.object
    obj.name = name
    obj.parent = parent
    world.move_to_collection(obj, parent.users_collection[0])
    obj.location = location
    obj.rotation_euler = (math.radians(90), 0, 0)
    obj.data.body = body
    obj.data.align_x = "CENTER"
    obj.data.align_y = "CENTER"
    obj.data.size = size
    obj.data.extrude = 0.025
    obj.data.bevel_depth = 0.009
    if os.path.exists(FONT_PATH):
        try:
            obj.data.font = bpy.data.fonts.load(FONT_PATH, check_existing=True)
        except Exception:
            pass
    obj.data.materials.append(mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj.select_set(False)
    return obj


def add_window(parent, name, x, y, z, trim_mat):
    world.box(parent, name + "_trim", (x, y, z), (0.92, 0.13, 1.06), trim_mat, 0.035)
    world.box(parent, name + "_glass", (x, y - 0.075, z), (0.72, 0.055, 0.84), MATS["glass"], 0.025)
    world.box(parent, name + "_cross_v", (x, y - 0.11, z), (0.055, 0.035, 0.82), trim_mat, 0.008)
    world.box(parent, name + "_cross_h", (x, y - 0.11, z), (0.70, 0.035, 0.055), trim_mat, 0.008)


def add_planter(parent, name, location, flower_mat=None):
    x, y, z = location
    world.box(parent, name + "_pot", (x, y, z + 0.18), (0.42, 0.34, 0.36), MATS["stone"], 0.05)
    world.ico(parent, name + "_leaf", (x, y, z + 0.58), 0.34, MATS["grass_dark"], 2, (0.78, 0.70, 1.15))
    if flower_mat:
        for index in range(3):
            angle = index / 3 * math.tau
            world.ico(parent, f"{name}_flower_{index}", (x + math.cos(angle) * 0.17, y, z + 0.83 + math.sin(angle) * 0.07), 0.09, flower_mat, 1)


def add_flat_roof(parent, name, width, depth, height, roof_mat, water_tank=False):
    world.box(parent, name + "_roof_slab", (0, 0, height + 0.18), (width + 0.42, depth + 0.42, 0.32), roof_mat, 0.06)
    for side in (-1, 1):
        world.box(parent, f"{name}_parapet_side_{side}", (side * width * 0.48, 0, height + 0.65), (0.22, depth + 0.24, 0.78), roof_mat, 0.035)
    world.box(parent, name + "_parapet_back", (0, depth * 0.49, height + 0.65), (width, 0.22, 0.78), roof_mat, 0.035)
    if water_tank:
        world.cylinder(parent, name + "_water_tank", (width * 0.25, 0.15, height + 1.22), 0.62, 1.18, MATS["ink"], 12)
        world.cylinder(parent, name + "_water_tank_lid", (width * 0.25, 0.15, height + 1.83), 0.66, 0.10, MATS["teal"], 12)


def add_pitched_roof(parent, name, width, depth, height, roof_mat):
    slope = math.radians(22)
    panel_depth = depth * 0.60
    z = height + 0.52
    for side in (-1, 1):
        panel = world.box(
            parent,
            f"{name}_roof_panel_{side}",
            (0, side * depth * 0.25, z),
            (width + 0.62, panel_depth, 0.22),
            roof_mat,
            0.045,
            (side * slope, 0, 0),
        )
        panel["roof_panel"] = True
    world.box(parent, name + "_ridge", (0, 0, height + 0.86), (width + 0.68, 0.18, 0.18), MATS["wood"], 0.025)


def create_building(spec, target):
    name = spec["name"]
    x = spec["x"]
    y = spec["y"]
    width = spec["width"]
    depth = spec["depth"]
    floors = spec["floors"]
    wall_mat = MATS[spec["wall"]]
    trim_mat = MATS[spec.get("trim", "wood")]
    direction = local_direction(x, y)
    preferred = preferred_away_from(direction, street_direction(y))
    parent = world.oriented_root("OBSTACLE_" + name, direction, -0.08, preferred, target)
    parent["obstacle_radius"] = round(max(width, depth) * 0.58, 3)
    parent["district"] = "CITY_2_JHEEL_MANDIR_SLICE"
    height = floors * 2.42
    front = -depth * 0.51

    world.box(parent, name + "_foundation", (0, 0, 0.18), (width + 0.55, depth + 0.55, 0.62), MATS["stone_dark"], 0.08)
    world.box(parent, name + "_body", (0, 0, height * 0.50 + 0.28), (width, depth, height), wall_mat, 0.075)
    world.box(parent, name + "_base_band", (0, front - 0.02, 0.66), (width + 0.06, 0.16, 0.70), MATS["stone"], 0.025)

    for floor in range(floors):
        z = 1.42 + floor * 2.30
        if floor == 0 and spec.get("shop"):
            world.box(parent, f"{name}_shop_opening", (0, front - 0.06, z), (width * 0.68, 0.13, 1.55), MATS["glass"], 0.04)
            world.box(parent, f"{name}_counter", (0, front - 0.38, 0.98), (width * 0.76, 0.64, 0.28), MATS["wood"], 0.055)
        else:
            for index, wx in enumerate((-width * 0.26, width * 0.26)):
                add_window(parent, f"{name}_window_{floor}_{index}", wx, front - 0.04, z, trim_mat)

    door_x = width * 0.29 if spec.get("shop") else 0
    world.box(parent, name + "_door_trim", (door_x, front - 0.08, 1.05), (1.08, 0.15, 1.92), trim_mat, 0.06)
    world.box(parent, name + "_door", (door_x, front - 0.17, 1.03), (0.84, 0.10, 1.72), MATS["wood"], 0.045)
    world.box(parent, name + "_door_step", (door_x, front - 0.54, 0.22), (1.42, 0.86, 0.24), MATS["stone_light"], 0.05)

    if spec.get("balcony") and floors >= 2:
        balcony_z = 2.72
        world.box(parent, name + "_balcony_slab", (0, front - 0.58, balcony_z), (width * 0.82, 1.25, 0.24), MATS["stone_light"], 0.05)
        for index in range(9):
            bx = -width * 0.34 + index * width * 0.085
            world.box(parent, f"{name}_baluster_{index}", (bx, front - 1.14, balcony_z + 0.46), (0.055, 0.055, 0.86), MATS["teal_dark"], 0.012)
        world.box(parent, name + "_balcony_rail", (0, front - 1.14, balcony_z + 0.88), (width * 0.82, 0.08, 0.09), MATS["teal_dark"], 0.015)
        add_planter(parent, name + "_balcony_planter", (-width * 0.26, front - 1.00, balcony_z + 0.18), MATS["pink"])

    if spec.get("roof") == "pitched":
        add_pitched_roof(parent, name, width, depth, height + 0.28, MATS[spec.get("roof_mat", "teal")])
    else:
        add_flat_roof(parent, name, width, depth, height + 0.28, MATS[spec.get("roof_mat", "paper")], spec.get("tank", False))

    sign_text = spec.get("sign")
    if sign_text:
        sign_z = 2.28 if spec.get("shop") else 2.62
        sign_mat = MATS[spec.get("sign_mat", "saffron")]
        world.box(parent, name + "_sign_panel", (0, front - 0.27, sign_z), (width * 0.72, 0.17, 0.74), sign_mat, 0.055)
        add_text(parent, name + "_sign_text", sign_text, (0, front - 0.39, sign_z), 0.46, MATS["paper"])

    if spec.get("awning"):
        awning = world.box(parent, name + "_awning", (0, front - 0.72, 2.22), (width * 0.90, 1.45, 0.22), MATS[spec.get("awning", "yellow")], 0.045, (0.14, 0, 0))
        awning["shop_awning"] = True
        for stripe in (-0.34, 0.0, 0.34):
            world.box(parent, f"{name}_awning_stripe_{stripe}", (stripe * width, front - 1.05, 2.28), (0.18, 0.78, 0.07), MATS["paper"], 0.012, (0.14, 0, 0))

    world.box(parent, name + "_drain_pipe", (width * 0.45, front - 0.12, height * 0.52), (0.10, 0.10, height * 0.90), MATS["stone_dark"], 0.018)
    add_planter(parent, name + "_front_planter", (-width * 0.34, front - 0.48, 0.22), MATS["yellow"])
    return parent


def create_chai_details(building):
    front = -2.00
    world.ico(building, "Chai_kettle_body", (-0.78, front - 0.47, 1.43), 0.34, MATS["paper"], 2, (1.18, 0.78, 0.92))
    world.cylinder(building, "Chai_kettle_lid", (-0.78, front - 0.47, 1.78), 0.18, 0.09, MATS["ink"], 10)
    world.box(building, "Chai_kettle_spout", (-1.14, front - 0.47, 1.52), (0.52, 0.12, 0.12), MATS["paper"], 0.025, (0, -0.28, 0))
    for index in range(4):
        world.cylinder(building, f"Chai_glass_{index}", (0.08 + index * 0.28, front - 0.48, 1.42), 0.08, 0.28, MATS["water"], 10)
    vendor = world.oriented_root(
        "NPC_CHAI_VENDOR",
        local_direction(4.10, -8.5),
        0.28,
        preferred_away_from(local_direction(4.10, -8.5), street_direction(-8.5)),
        building.users_collection[0],
    )
    world.ico(vendor, "Vendor_body", (0, 0, 0.82), 0.48, MATS["plaster_blue"], 2, (0.78, 0.60, 1.15))
    world.ico(vendor, "Vendor_head", (0, 0, 1.62), 0.29, MATS["skin"], 2, (0.94, 0.90, 1.04))
    world.ico(vendor, "Vendor_hair", (0, 0.02, 1.82), 0.30, MATS["ink"], 2, (1.0, 0.92, 0.60))
    world.box(vendor, "Vendor_moustache", (0, -0.27, 1.57), (0.26, 0.04, 0.06), MATS["ink"], 0.02)


def create_buildings(target):
    specs = [
        {"name": "JHEEL_CHAI", "x": 6.0, "y": -8.5, "width": 5.4, "depth": 4.0, "floors": 1, "wall": "teal", "trim": "wood", "shop": True, "sign": "चाय", "sign_mat": "saffron", "awning": "yellow", "roof": "flat", "roof_mat": "teal_dark"},
        {"name": "ATITHI_GUESTHOUSE", "x": -6.2, "y": -8.0, "width": 5.4, "depth": 4.3, "floors": 3, "wall": "plaster", "trim": "teal_dark", "balcony": True, "sign": "अतिथि", "sign_mat": "blue", "roof": "pitched", "roof_mat": "teal"},
        {"name": "KIRANA_STORE", "x": 6.1, "y": -3.0, "width": 5.2, "depth": 4.0, "floors": 2, "wall": "plaster_yellow", "trim": "wood", "shop": True, "sign": "किराना", "sign_mat": "coral", "awning": "coral", "roof": "flat", "roof_mat": "paper", "tank": True},
        {"name": "PAHADI_TAILOR", "x": -6.1, "y": -2.4, "width": 5.0, "depth": 4.0, "floors": 2, "wall": "plaster_blue", "trim": "teal_dark", "shop": True, "sign": "दर्जी", "sign_mat": "teal", "awning": "teal", "roof": "pitched", "roof_mat": "blue"},
        {"name": "RASOI_CAFE", "x": 6.2, "y": 2.6, "width": 5.4, "depth": 4.2, "floors": 2, "wall": "plaster_coral", "trim": "paper", "shop": True, "balcony": True, "sign": "रसोई", "sign_mat": "saffron", "awning": "yellow", "roof": "flat", "roof_mat": "paper"},
        {"name": "DAK_GHAR", "x": -6.0, "y": 3.1, "width": 5.2, "depth": 4.0, "floors": 1, "wall": "plaster", "trim": "coral", "sign": "डाकघर", "sign_mat": "coral", "roof": "pitched", "roof_mat": "coral"},
        {"name": "NEEL_HOMESTAY", "x": 6.1, "y": 8.3, "width": 5.6, "depth": 4.4, "floors": 3, "wall": "plaster_blue", "trim": "wood", "balcony": True, "sign": "नील घर", "sign_mat": "blue", "roof": "pitched", "roof_mat": "teal_dark"},
        {"name": "HASTSHILP_HOUSE", "x": -6.2, "y": 8.7, "width": 5.3, "depth": 4.1, "floors": 2, "wall": "plaster_yellow", "trim": "teal_dark", "shop": True, "balcony": True, "sign": "हस्तशिल्प", "sign_mat": "teal", "awning": "saffron", "roof": "flat", "roof_mat": "paper", "tank": True},
    ]
    buildings = []
    for spec in specs:
        buildings.append((spec, create_building(spec, target)))
    create_chai_details(buildings[0][1])
    return specs


def create_tree(name, x, y, scale, target, blossom=False):
    direction = local_direction(x, y)
    parent = world.oriented_root(name, direction, 0.02, target=target)
    world.cylinder(parent, name + "_trunk", (0, 0, 1.55 * scale), 0.17 * scale, 3.10 * scale, MATS["wood"], 8)
    crown_mats = [MATS["pink"], MATS["plaster_coral"]] if blossom else [MATS["grass_dark"], MATS["grass"], MATS["grass_light"]]
    clusters = (
        (-0.72, 0.02, 2.95, 0.96), (0.58, 0.08, 3.00, 1.10),
        (0.02, -0.03, 3.78, 1.02), (-1.08, 0.04, 3.62, 0.76),
        (1.06, 0.03, 3.62, 0.80),
    )
    for index, (lx, ly, lz, radius) in enumerate(clusters):
        mat = crown_mats[index % len(crown_mats)]
        world.ico(parent, f"{name}_crown_{index}", (lx * scale, ly * scale, lz * scale), radius * scale, mat, 2, (1.0, 0.78, 1.0))
    return parent


def create_vegetation(target):
    specs = (
        (-11.0, -11.0, 1.05, False), (11.2, -12.0, 0.96, False),
        (-11.2, -5.2, 0.88, True), (11.3, -5.8, 0.90, False),
        (-11.0, 0.6, 1.02, False), (11.6, 0.4, 0.86, True),
        (-11.4, 6.6, 0.92, False), (11.2, 6.6, 1.02, False),
        (-10.5, 12.0, 0.98, True), (10.8, 12.2, 0.90, False),
        (-2.4, 14.2, 0.82, False), (3.0, 14.8, 0.76, False),
    )
    for index, (x, y, scale, blossom) in enumerate(specs):
        create_tree(f"ENV_Lakeside_tree_{index:02d}", x, y, scale, target, blossom)


def create_ghat_and_shrine(target):
    lake_level = world.RADIUS + 0.18
    world.create_disc("LANDMARK_SLICE_LAKE_SHORE", world.LAKE_CENTER, 7.2, MATS["stone_light"], target, 8, 72, lake_level - 0.06)
    lake = world.create_disc("LANDMARK_SLICE_Neel_Taal", world.LAKE_CENTER, 6.55, MATS["water"], target, 9, 84, lake_level)
    lake["water"] = True

    ghat_direction = world.direction_from_local(world.LAKE_CENTER, -6.0, -0.5)
    ghat = world.oriented_root("LANDMARK_LAKESIDE_GHAT", ghat_direction, 0.18, preferred_away_from(ghat_direction, world.LAKE_CENTER), target)
    for index in range(6):
        world.box(
            ghat,
            f"Ghat_step_{index}",
            (0, -index * 0.52, 0.12 + index * 0.13),
            (4.8 - index * 0.22, 0.78, 0.24 + index * 0.05),
            MATS["stone_light" if index % 2 else "paper"],
            0.035,
        )
    world.box(ghat, "Ghat_landing", (0, -3.25, 0.82), (4.2, 2.2, 0.28), MATS["paper"], 0.055)

    shrine_direction = world.direction_from_local(world.LAKE_CENTER, 4.8, 2.0)
    shrine = world.oriented_root("LANDMARK_JHEEL_MANDIR", shrine_direction, 0.12, preferred_away_from(shrine_direction, world.LAKE_CENTER), target)
    world.box(shrine, "Mandir_plinth", (0, 0, 0.25), (4.4, 3.8, 0.50), MATS["stone_light"], 0.07)
    for x in (-1.35, 1.35):
        for y in (-0.95, 0.95):
            world.cylinder(shrine, f"Mandir_column_{x}_{y}", (x, y, 1.72), 0.16, 2.72, MATS["paper"], 8)
    world.cone(shrine, "Mandir_roof", (0, 0, 3.30), 2.55, 1.20, MATS["paper"], 4, 0.62)
    world.cone(shrine, "Mandir_shikhara", (0, 0, 4.33), 0.72, 1.42, MATS["saffron"], 8, 0.08)
    world.ico(shrine, "Mandir_finial", (0, 0, 5.14), 0.18, MATS["yellow"], 2, (1, 1, 1.3))
    for index, x in enumerate((-1.1, 0, 1.1)):
        world.cylinder(shrine, f"Mandir_bell_{index}", (x, -1.55, 2.62), 0.11, 0.25, MATS["yellow"], 9)


def child_root(parent, name, location, target):
    root = bpy.data.objects.new(name, None)
    target.objects.link(root)
    root.parent = parent
    root.location = location
    return root


def create_local_ribbon(parent, name, points, width, mat, target, lift=0.0):
    vertices = []
    faces = []
    count = len(points)
    for index, point in enumerate(points):
        previous = points[max(0, index - 1)]
        following = points[min(count - 1, index + 1)]
        tangent = (following - previous).normalized()
        radial = Vector((point.x, point.y, max(2.5, point.z * 0.32))).normalized()
        side = tangent.cross(radial).normalized()
        for sign in (-1, 1):
            vertices.append(tuple(point + side * sign * width * 0.5 + radial * lift))
    for index in range(count - 1):
        faces.append((index * 2, index * 2 + 1, (index + 1) * 2 + 1, (index + 1) * 2))
    mesh = bpy.data.meshes.new(name + "_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    target.objects.link(obj)
    obj.parent = parent
    obj.data.materials.append(mat)
    return obj


def create_mountain_road_points(radius=14.5, height=34.0, samples=201):
    profile = (
        (0.00, 1.00),
        (0.30, 0.84),
        (0.57, 0.60),
        (0.79, 0.35),
        (1.00, 0.055),
    )

    def mountain_radius_at(height_ratio):
        for index in range(1, len(profile)):
            lower_t, lower_radius = profile[index - 1]
            upper_t, upper_radius = profile[index]
            if height_ratio <= upper_t:
                blend = (height_ratio - lower_t) / (upper_t - lower_t)
                return radius * (lower_radius + (upper_radius - lower_radius) * blend)
        return radius * profile[-1][1]

    points = []
    for index in range(samples):
        t = index / (samples - 1)
        z = 1.0 + t * 28.6
        surface_radius = mountain_radius_at(z / height)
        angle = -math.pi * 0.5 + math.tau * 2.45 * t + math.sin(t * math.tau * 5.0) * 0.10
        # The faceted peak deliberately reaches beyond its nominal ring radius.
        # Keep the full ribbon, guard posts, jeep and camera outside that silhouette.
        road_radius = surface_radius * 1.15 + 2.30
        points.append(Vector((
            math.cos(angle) * road_radius,
            math.sin(angle) * road_radius,
            z,
        )))
    return points


def create_rest_stop(parent, point, name, label, mat, target, large=False):
    radial = Vector((point.x, point.y, 0.0)).normalized()
    pad_center = point + radial * (3.8 if large else 2.8) + Vector((0, 0, 0.08))
    dimensions = (14.0, 11.5, 0.52) if large else (6.4, 5.4, 0.46)

    shelf_radius = 5.5 if large else 3.15
    shelf = world.ico(
        parent,
        f"Mountain_stop_{name}_rock_shelf",
        tuple(pad_center - radial * (2.0 if large else 1.55) + Vector((0, 0, -2.05 if large else -1.55))),
        shelf_radius,
        MATS["stone_dark"],
        1,
        (1.45, 1.32, 0.72),
    )
    shelf["mountain_stop_support"] = name
    world.ico(
        parent,
        f"Mountain_stop_{name}_rock_detail",
        tuple(pad_center + radial * 1.15 + Vector((0, 0, -1.15))),
        1.55 if large else 1.0,
        MATS["stone"],
        1,
        (1.2, 1.0, 0.85),
    )

    pad = world.box(parent, f"WALKABLE_MOUNTAIN_STOP_{name}", tuple(pad_center), dimensions, MATS["stone_light"], 0.08)
    pad["walkable"] = True
    pad["jeep_stop"] = name

    bridge_center = point + radial * 1.15 + Vector((0, 0, 0.12))
    world.box(parent, f"Stop_{name}_road_link", tuple(bridge_center), (3.0, 2.8, 0.30), MATS["paper"], 0.045)

    exit_center = pad_center - radial * (1.10 if large else 1.45)
    marker = child_root(parent, f"JEEP_STOP_{name}_EXIT", tuple(exit_center + Vector((0, 0, 0.38))), target)
    marker["jeep_stop"] = name
    marker["stop_label"] = label

    rail = child_root(parent, f"ENV_MOUNTAIN_STOP_{name}_RAIL", tuple(pad_center + radial * (4.65 if large else 2.25)), target)
    rail.rotation_euler[2] = math.atan2(radial.y, radial.x) - math.pi * 0.5
    rail_width = 10.8 if large else 4.7
    for x in (-rail_width * 0.5, 0, rail_width * 0.5):
        world.cylinder(rail, f"Stop_{name}_rail_post_{x}", (x, 0, 0.72), 0.07, 1.45, MATS["paper"], 7)
    for z in (0.64, 1.20):
        world.box(rail, f"Stop_{name}_rail_bar_{z}", (0, 0, z), (rail_width + 0.15, 0.11, 0.11), MATS["paper"], 0.025)

    if not large:
        shelter = child_root(parent, f"OBSTACLE_REST_STOP_{name}", tuple(pad_center + radial * 1.15), target)
        shelter.rotation_euler[2] = math.atan2(radial.y, radial.x) - math.pi * 0.5
        world.box(shelter, f"Rest_{name}_bench", (0, 0, 0.42), (2.5, 0.72, 0.52), MATS["wood"], 0.06)
        for x in (-1.25, 1.25):
            world.cylinder(shelter, f"Rest_{name}_post_{x}", (x, 0.55, 1.75), 0.10, 3.2, MATS["wood"], 8)
        world.box(shelter, f"Rest_{name}_roof", (0, 0.55, 3.10), (3.4, 2.2, 0.24), mat, 0.04, (0.10, 0, 0))
        world.box(shelter, f"Rest_{name}_sign", (0, -0.25, 1.82), (2.5, 0.15, 0.72), MATS["teal_dark"], 0.04)
        add_text(shelter, f"Rest_{name}_text", label, (0, -0.36, 1.82), 0.34, MATS["paper"])
        for index in range(3):
            world.ico(shelter, f"Rest_{name}_discovery_{index}", (-1.4 + index * 1.4, -1.45, 0.42), 0.26, MATS["grass_light" if index % 2 else "pink"], 1)
    return pad_center


def create_summit_village(parent, center, target):
    village = child_root(parent, "CITY_4_SHIKHAR_MANDIR_VILLAGE", tuple(center), target)

    temple = child_root(village, "OBSTACLE_SUMMIT_TEMPLE", (2.1, 1.0, 0.30), target)
    world.box(temple, "Summit_temple_plinth", (0, 0, 0.28), (5.0, 4.2, 0.56), MATS["stone_light"], 0.08)
    for x in (-1.55, 1.55):
        for y in (-1.18, 1.18):
            world.cylinder(temple, f"Summit_column_{x}_{y}", (x, y, 1.82), 0.18, 2.95, MATS["paper"], 8)
    world.cone(temple, "Summit_temple_roof", (0, 0, 3.42), 2.85, 1.25, MATS["paper"], 4, 0.58)
    world.cone(temple, "Summit_shikhara", (0, 0, 4.62), 0.82, 1.65, MATS["saffron"], 8, 0.08)
    world.ico(temple, "Summit_finial", (0, 0, 5.55), 0.19, MATS["yellow"], 2, (1, 1, 1.35))

    shop_specs = (
        ("SUMMIT_DHABA", -4.6, -2.7, "plaster_yellow", "yellow", "ढाबा"),
        ("SUMMIT_GUESTHOUSE", -4.8, 2.8, "plaster_blue", "teal", "विश्राम"),
        ("SUMMIT_CRAFT_SHOP", 4.9, -2.8, "plaster_coral", "saffron", "पूजा"),
    )
    for name, x, y, wall, awning, sign in shop_specs:
        building = child_root(village, "OBSTACLE_" + name, (x, y, 0.30), target)
        world.box(building, name + "_body", (0, 0, 1.55), (3.9, 3.1, 3.1), MATS[wall], 0.07)
        world.box(building, name + "_roof", (0, 0, 3.28), (4.3, 3.5, 0.30), MATS["teal_dark"], 0.05)
        world.box(building, name + "_door", (0, -1.58, 1.05), (0.92, 0.13, 1.80), MATS["wood"], 0.04)
        world.box(building, name + "_awning", (0, -1.92, 2.20), (3.2, 1.12, 0.20), MATS[awning], 0.04, (0.12, 0, 0))
        world.box(building, name + "_sign_panel", (0, -1.70, 2.62), (2.75, 0.15, 0.68), MATS["teal_dark"], 0.04)
        add_text(building, name + "_sign_text", sign, (0, -1.81, 2.62), 0.36, MATS["paper"])

    for index, (x, y) in enumerate(((-6.1, 0.0), (6.0, 0.2), (-1.6, 4.3), (5.5, 4.1))):
        tree = child_root(village, f"OBSTACLE_SUMMIT_DEODAR_{index}", (x, y, 0.25), target)
        world.cylinder(tree, f"Summit_tree_trunk_{index}", (0, 0, 1.4), 0.18, 2.8, MATS["wood"], 8)
        for tier in range(3):
            world.cone(tree, f"Summit_tree_crown_{index}_{tier}", (0, 0, 2.4 + tier * 0.85), 1.25 - tier * 0.22, 1.75, MATS["grass_dark"], 8)

    for line in range(3):
        root = child_root(village, f"ENV_Summit_prayer_flags_{line}", (0, -4.0 + line * 3.9, 0), target)
        for index in range(11):
            x = -6.0 + index * 1.2
            world.box(root, f"Summit_flag_{line}_{index}", (x, 0, 3.2 - abs(index - 5) * 0.05), (0.42, 0.04, 0.58), MATS[("saffron", "yellow", "teal", "pink")[index % 4]], 0.01)


def create_mountain_jeep(parent, start_point, target):
    jeep = child_root(parent, "MOUNTAIN_JEEP_SHUTTLE", tuple(start_point + Vector((0, 0, 0.46))), target)
    jeep["vehicle"] = "automatic_mountain_shuttle"
    world.box(jeep, "Jeep_chassis", (0, 0, 0.58), (1.95, 3.45, 0.56), MATS["stone_dark"], 0.10)
    world.box(jeep, "Jeep_body", (0, -0.16, 1.18), (1.86, 2.95, 1.25), MATS["saffron"], 0.13)
    world.box(jeep, "Jeep_cabin", (0, 0.38, 2.05), (1.76, 1.78, 0.92), MATS["teal_dark"], 0.08)
    world.box(jeep, "Jeep_windshield", (0, -0.55, 2.10), (1.48, 0.08, 0.62), MATS["glass"], 0.03, (0.18, 0, 0))
    world.box(jeep, "Jeep_roof", (0, 0.30, 2.62), (2.05, 2.05, 0.22), MATS["paper"], 0.06)
    world.box(jeep, "Jeep_front_bumper", (0, -1.83, 0.66), (2.15, 0.22, 0.26), MATS["ink"], 0.05)
    for side in (-1, 1):
        for axle, y in enumerate((-1.12, 1.02)):
            wheel = world.cylinder(jeep, f"Jeep_wheel_{side}_{axle}", (side * 1.02, y, 0.62), 0.46, 0.28, MATS["ink"], 12, (0, math.pi * 0.5, 0))
            wheel["wheel_radius"] = 0.46
        world.box(jeep, f"Jeep_headlight_{side}", (side * 0.58, -1.55, 1.22), (0.34, 0.12, 0.30), MATS["yellow"], 0.06)
    child_root(jeep, "JEEP_PASSENGER_SEAT", (0.46, 0.45, 1.40), target)
    child_root(jeep, "JEEP_EXIT_POINT", (-1.85, 0.1, 0.10), target)
    return jeep


def create_mountain_district(target):
    mountain_direction = local_direction(0.0, 44.0)
    mountain = world.create_peak("LANDMARK_SHIKHAR_MOUNTAIN", mountain_direction, 14.5, 34.0, target)
    mountain["district"] = "SHIKHAR_MANDIR"

    road_points = create_mountain_road_points()
    road_base = create_local_ribbon(mountain, "MOUNTAIN_JEEP_ROAD_BASE", road_points, 3.85, MATS["ink"], target, 0.04)
    road = create_local_ribbon(mountain, "MOUNTAIN_JEEP_ROAD", road_points, 3.12, MATS["earth_light"], target, 0.10)
    road["vehicle_only"] = True
    road["walking_forbidden"] = True
    road_base["collision_road_edge"] = True

    route = child_root(mountain, "JEEP_ROUTE_WAYPOINTS", (0, 0, 0), target)
    route_indices = list(range(0, len(road_points), 4))
    if route_indices[-1] != len(road_points) - 1:
        route_indices.append(len(road_points) - 1)
    for order, source_index in enumerate(route_indices):
        marker = child_root(route, f"JEEP_ROUTE_{order:03d}", tuple(road_points[source_index] + Vector((0, 0, 0.38))), target)
        marker["route_t"] = round(source_index / (len(road_points) - 1), 6)

    stop_specs = (
        ("BASE", "आधार पड़ाव", 0, "teal"),
        ("CHAI", "चाय विश्राम", 54, "saffron"),
        ("WATERFALL", "झरना मोड़", 104, "teal"),
        ("SUNSET", "सूर्य दृश्य", 153, "coral"),
        ("SUMMIT", "शिखर मंदिर", len(road_points) - 1, "yellow"),
    )
    stop_centers = {}
    for stop_order, (name, label, source_index, mat) in enumerate(stop_specs):
        center = create_rest_stop(
            mountain,
            road_points[source_index],
            name,
            label,
            MATS[mat],
            target,
            large=name == "SUMMIT",
        )
        stop_centers[name] = center
        stop_marker = child_root(route, f"JEEP_ROUTE_STOP_{stop_order:02d}_{name}", tuple(road_points[source_index] + Vector((0, 0, 0.38))), target)
        stop_marker["route_t"] = round(source_index / (len(road_points) - 1), 6)
        stop_marker["stop_name"] = name
        stop_marker["stop_label"] = label

    create_summit_village(mountain, stop_centers["SUMMIT"] + Vector((0, 0, 0.22)), target)
    create_mountain_jeep(mountain, road_points[0], target)

    for index in range(0, len(road_points), 7):
        point = road_points[index]
        previous = road_points[max(0, index - 1)]
        following = road_points[min(len(road_points) - 1, index + 1)]
        tangent = (following - previous).normalized()
        radial = Vector((point.x, point.y, max(2.5, point.z * 0.30))).normalized()
        side = tangent.cross(radial).normalized()
        if Vector((point.x + side.x, point.y + side.y, 0)).length < Vector((point.x, point.y, 0)).length:
            side.negate()
        post_location = point + side * 1.78 + Vector((0, 0, 0.52))
        world.cylinder(mountain, f"Mountain_guard_post_{index:03d}", tuple(post_location), 0.07, 1.05, MATS["paper"], 7)

    approach = [street_direction(12.4 + index * 0.20) for index in range(66)]
    approach_obj = world.create_ribbon("WALKABLE_JEEP_BASE_APPROACH", approach, 3.8, MATS["stone_light"], 0.22, target)
    approach_obj["walkable"] = True

    route_length = sum((road_points[index] - road_points[index - 1]).length for index in range(1, len(road_points)))
    return mountain, {
        "mountain_height": 34.0,
        "jeep_route_length": round(route_length, 2),
        "jeep_stop_count": len(stop_specs),
        "walking_route_to_summit": False,
        "ascent_mode": "automatic_jeep_only",
    }


def create_bunting(target, y, name):
    center_direction = street_direction(y)
    preferred = street_direction(y + 0.5) - center_direction * street_direction(y + 0.5).dot(center_direction)
    root = world.oriented_root(name, center_direction, 0.28, preferred, target)
    rope = bpy.data.curves.new(name + "_rope_curve", "CURVE")
    rope.dimensions = "3D"
    rope.bevel_depth = 0.018
    rope.bevel_resolution = 0
    spline = rope.splines.new("POLY")
    spline.points.add(12)
    for index in range(13):
        t = index / 12
        x = -4.4 + t * 8.8
        z = 5.65 - math.sin(math.pi * t) * 0.42
        spline.points[index].co = (x, 0, z, 1)
    rope_obj = bpy.data.objects.new(name + "_rope", rope)
    rope_obj.parent = root
    target.objects.link(rope_obj)
    rope_obj.data.materials.append(MATS["ink"])

    vertices = []
    faces = []
    for index in range(11):
        t = (index + 1) / 12
        x = -4.4 + t * 8.8
        z = 5.65 - math.sin(math.pi * t) * 0.42
        start = len(vertices)
        vertices.extend(((x - 0.19, -0.02, z), (x + 0.19, -0.02, z), (x, -0.02, z - 0.54)))
        faces.append((start, start + 1, start + 2))
    mesh = bpy.data.meshes.new(name + "_flags_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    flags = bpy.data.objects.new(name + "_flags", mesh)
    flags.parent = root
    target.objects.link(flags)
    flags.data.materials.append(MATS["saffron"])


def create_utility_detail(target):
    pole_directions = []
    for index, (x, y) in enumerate(((-3.75, -10.8), (3.75, -2.0), (-3.75, 7.5))):
        direction = local_direction(x, y)
        root = world.oriented_root(f"ENV_Utility_pole_{index}", direction, 0.20, target=target)
        world.cylinder(root, f"Pole_shaft_{index}", (0, 0, 3.1), 0.11, 6.2, MATS["wood"], 9)
        world.box(root, f"Pole_crossbar_{index}", (0, 0, 5.65), (1.55, 0.12, 0.12), MATS["ink"], 0.015)
        pole_directions.append(direction)
    for index in range(len(pole_directions) - 1):
        start = world.surface(pole_directions[index], 5.85)
        end = world.surface(pole_directions[index + 1], 5.85)
        curve = bpy.data.curves.new(f"Overhead_wire_{index}_curve", "CURVE")
        curve.dimensions = "3D"
        curve.bevel_depth = 0.018
        curve.bevel_resolution = 0
        spline = curve.splines.new("POLY")
        spline.points.add(16)
        for step in range(17):
            t = step / 16
            point = start.lerp(end, t)
            point -= point.normalized() * (math.sin(math.pi * t) * 0.48)
            spline.points[step].co = (*point, 1)
        obj = bpy.data.objects.new(f"ENV_Overhead_wire_{index}", curve)
        target.objects.link(obj)
        obj.data.materials.append(MATS["ink"])
    create_bunting(target, 0.5, "ENV_Marigold_bunting_lower")
    create_bunting(target, 6.2, "ENV_Marigold_bunting_upper")


def create_character(target):
    direction = local_direction(street_x(-11.1), -11.1)
    forward_target = street_direction(-10.1)
    forward = forward_target - direction * forward_target.dot(direction)
    player = world.oriented_root("PLAYER_RIG_PREVIEW", direction, 0.28, forward, target)
    player["preview_only"] = True
    world.ico(player, "Player_torso", (0, 0, 1.48), 0.55, MATS["shirt"], 2, (0.78, 0.58, 1.05))
    world.ico(player, "Player_pants", (0, 0, 0.93), 0.45, MATS["pants"], 2, (0.88, 0.72, 0.78))
    world.cylinder(player, "Player_neck", (0, 0, 1.98), 0.115, 0.22, MATS["skin"], 10)
    world.ico(player, "Player_head", (0, 0, 2.28), 0.35, MATS["skin"], 3, (0.94, 0.91, 1.07))
    world.ico(player, "Player_hair_cap", (0, 0.01, 2.53), 0.38, MATS["ink"], 2, (1.02, 0.94, 0.62))
    for index, x in enumerate((-0.27, -0.14, 0.0, 0.14, 0.27)):
        spike = world.cone(player, f"Player_hair_spike_{index}", (x, 0.03, 2.77 + (0.08 if index == 2 else 0)), 0.10, 0.34, MATS["ink"], 7)
        spike.rotation_euler.y = (index - 2) * -0.12
    world.ico(player, "Player_backpack", (0, 0.32, 1.42), 0.50, MATS["stone_dark"], 2, (0.86, 0.42, 1.10))
    for side in (-1, 1):
        arm = bpy.data.objects.new(f"Player_arm_{side}", None)
        target.objects.link(arm)
        arm.parent = player
        arm.location = (side * 0.48, 0, 1.62)
        world.ico(arm, f"Player_sleeve_{side}", (0, 0, -0.06), 0.20, MATS["shirt"], 2, (0.90, 0.90, 1.10))
        world.cylinder(arm, f"Player_arm_mesh_{side}", (0, 0, -0.34), 0.09, 0.48, MATS["skin"], 10)
        world.ico(arm, f"Player_hand_{side}", (0, 0, -0.64), 0.11, MATS["skin"], 2)
        leg = bpy.data.objects.new(f"Player_leg_{side}", None)
        target.objects.link(leg)
        leg.parent = player
        leg.location = (side * 0.20, 0, 0.80)
        world.cylinder(leg, f"Player_leg_mesh_{side}", (0, 0, -0.34), 0.13, 0.72, MATS["pants"], 10)
        world.box(leg, f"Player_shoe_{side}", (0, -0.12, -0.76), (0.36, 0.54, 0.23), MATS["yellow"], 0.07)
    world.box(player, "Player_shirt_placket", (0, -0.32, 1.48), (0.06, 0.035, 0.52), MATS["paper"], 0.015)
    return direction


def configure_render():
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except Exception:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 1000
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world = scene.world or bpy.data.worlds.new("Nimbu lakeside sky")
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = PALETTE["sky"]
    background.inputs["Strength"].default_value = 0.46

    scene.render.use_freestyle = True
    scene.render.line_thickness = 1.35
    lineset = bpy.context.view_layer.freestyle_settings.linesets[0]
    lineset.select_silhouette = True
    lineset.select_border = True
    lineset.select_crease = False
    lineset.select_external_contour = True
    lineset.select_material_boundary = True
    linestyle = lineset.linestyle
    linestyle.color = PALETTE["ink"][:3]
    linestyle.thickness = 1.35
    linestyle.alpha = 0.96
    try:
        scene.view_settings.view_transform = "Standard"
        scene.view_settings.look = "Medium High Contrast"
    except Exception:
        pass


def create_lighting(center_direction):
    right, forward, up = world.tangent_basis(center_direction)
    bpy.ops.object.light_add(type="SUN", location=(0, 0, 0))
    sun = bpy.context.object
    sun.name = "Lakeside_illustrated_sun"
    sun.data.energy = 1.25
    sun.data.color = (1.0, 0.88, 0.68)
    sun.data.angle = math.radians(7)
    sun.rotation_euler = (math.radians(28), math.radians(-24), math.radians(-34))

    light_position = world.surface(center_direction, 0) + up * 28 - forward * 14 + right * 16
    bpy.ops.object.light_add(type="AREA", location=light_position)
    fill = bpy.context.object
    fill.name = "Lakeside_soft_fill"
    fill.data.energy = 230
    fill.data.shape = "DISK"
    fill.data.size = 20
    fill.rotation_euler = (world.surface(center_direction, 1.5) - fill.location).to_track_quat("-Z", "Y").to_euler()


def create_camera(name, location, target, lens):
    bpy.ops.object.camera_add(location=location)
    camera = bpy.context.object
    camera.name = name
    camera.data.lens = lens
    camera.data.sensor_width = 36
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()
    return camera


def validate_layout(street_path, building_specs):
    results = []
    blocked = []
    for spec in building_specs:
        direction = local_direction(spec["x"], spec["y"])
        footprint = max(spec["width"], spec["depth"]) * 0.52
        center_clearance = min(world.angular_distance(direction, point) for point in street_path)
        edge_clearance = center_clearance - footprint
        item = {
            "name": spec["name"],
            "center_clearance": round(center_clearance, 3),
            "edge_clearance": round(edge_clearance, 3),
        }
        results.append(item)
        if edge_clearance < 2.10:
            blocked.append(spec["name"])
    report = {
        "clear": not blocked,
        "blocked": blocked,
        "building_checks": results,
        "street_samples": len(street_path),
        "building_count": len(building_specs),
    }
    with open(REPORT_PATH, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2, ensure_ascii=False)
    if blocked:
        raise RuntimeError("Lakeside walking street blocked by: " + ", ".join(blocked))
    print("NIMBU_LAKESIDE_LAYOUT_CLEAR", json.dumps(report))
    return report


def build():
    world.clear_scene()
    export = world.make_collection("EXPORT_LAKESIDE_VILLAGE_SLICE")

    planet = world.create_planet(export)
    planet.name = "BASE_LAKESIDE_CURVED_PLANET"
    district = bpy.data.objects.new("CITY_2_JHEEL_MANDIR_SLICE", None)
    export.objects.link(district)

    # Distant peaks frame the street but do not occupy its collision envelope.
    peak_specs = (
        (-24.0, 30.0, 5.4, 11.5), (-19.0, 41.0, 5.8, 13.0),
        (20.0, 40.0, 6.0, 13.8), (25.0, 29.0, 5.2, 11.2),
    )
    for index, (x, y, radius, height) in enumerate(peak_specs):
        world.create_peak(f"BACKGROUND_Himalaya_{index:02d}", world.local_direction(x, y), radius, height, export)

    mountain_root, mountain_report = create_mountain_district(export)
    create_ghat_and_shrine(export)
    street_path = create_street(export)
    specs = create_buildings(export)
    create_vegetation(export)
    create_utility_detail(export)
    player_direction = create_character(export)
    report = validate_layout(street_path, specs)
    report.update(mountain_report)
    with open(REPORT_PATH, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2, ensure_ascii=False)

    configure_render()
    create_lighting(VILLAGE_CENTER)

    right, forward, up = world.tangent_basis(player_direction, street_direction(-10.0) - player_direction * street_direction(-10.0).dot(player_direction))
    player_surface = world.surface(player_direction, 0.28)
    gameplay_camera = create_camera(
        "CAMERA_Lakeside_Gameplay",
        player_surface + up * 4.9 - forward * 12.2 + right * 0.55,
        player_surface + up * 1.55 + forward * 13.2,
        50,
    )

    overview_camera = create_camera(
        "CAMERA_Lakeside_Overview",
        player_surface + up * 14.5 - forward * 20.0 + right * 16.5,
        player_surface + up * 1.4 + forward * 5.5,
        52,
    )

    close_camera = create_camera(
        "CAMERA_Lakeside_Close",
        player_surface + up * 3.8 - forward * 7.2 - right * 5.8,
        player_surface + up * 1.55 + forward * 7.0 + right * 0.7,
        55,
    )

    lake_camera_surface = world.surface(world.LAKE_CENTER, 0.28)
    lake_camera_right, lake_camera_forward, lake_camera_up = world.tangent_basis(world.LAKE_CENTER)
    lake_camera = create_camera(
        "CAMERA_Lakeside_Ghat",
        lake_camera_surface + lake_camera_up * 14.0 - lake_camera_forward * 18.0 - lake_camera_right * 14.0,
        lake_camera_surface + lake_camera_up * 0.9,
        58,
    )

    bpy.context.view_layer.update()
    mountain_camera_location = mountain_root.matrix_world @ Vector((44.0, -52.0, 28.0))
    mountain_camera_target = mountain_root.matrix_world @ Vector((0.0, 0.0, 15.0))
    mountain_camera = create_camera(
        "CAMERA_Shikhar_Mountain_Overview",
        mountain_camera_location,
        mountain_camera_target,
        55,
    )

    scene = bpy.context.scene
    scene.camera = gameplay_camera
    scene.render.filepath = os.path.join(OUTPUT_DIR, "nimbu_lakeside_village_gameplay.png")
    bpy.ops.render.render(write_still=True)
    scene.camera = overview_camera
    scene.render.filepath = os.path.join(OUTPUT_DIR, "nimbu_lakeside_village_overview.png")
    bpy.ops.render.render(write_still=True)
    scene.camera = close_camera
    scene.render.filepath = os.path.join(OUTPUT_DIR, "nimbu_lakeside_village_close.png")
    bpy.ops.render.render(write_still=True)
    scene.camera = lake_camera
    scene.render.filepath = os.path.join(OUTPUT_DIR, "nimbu_lakeside_village_ghat.png")
    bpy.ops.render.render(write_still=True)
    scene.camera = mountain_camera
    scene.render.filepath = os.path.join(OUTPUT_DIR, "nimbu_shikhar_mountain_overview.png")
    bpy.ops.render.render(write_still=True)
    scene.camera = gameplay_camera

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
    print("NIMBU_LAKESIDE_SLICE_COMPLETE", BLEND_PATH, GLB_PATH, json.dumps(report))


if __name__ == "__main__":
    build()
