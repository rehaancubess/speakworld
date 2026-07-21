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
BLEND_PATH = os.path.join(BLENDER_DIR, "nimbu_grand_world.blend")
GLB_PATH = os.path.join(ROOT, "public", "assets", "nimbu_grand_world.glb")
REPORT_PATH = os.path.join(OUTPUT_DIR, "nimbu_grand_world_report.json")
AUTO_RICKSHAW_SOURCE = os.path.join(BLENDER_DIR, "source_assets", "indian_auto_rickshaw.glb")

spec = importlib.util.spec_from_file_location(
    "nimbu_base",
    os.path.join(BLENDER_DIR, "nimbu_diorama_v1_builder.py"),
)
base = importlib.util.module_from_spec(spec)
sys.modules["nimbu_base"] = base
spec.loader.exec_module(base)

random.seed(20260721)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(os.path.dirname(GLB_PATH), exist_ok=True)
MATS = base.MATS
MATS["grand_grass_light"] = base.material("Grand grass sun", (0.42, 0.60, 0.25, 1))
MATS["grand_grass_dark"] = base.material("Grand grass shade", (0.31, 0.50, 0.21, 1))


def import_auto_rickshaw_template(collection):
    """Import the user's detailed tuk-tuk and discard its purple display stand."""
    if not os.path.exists(AUTO_RICKSHAW_SOURCE):
        raise FileNotFoundError(f"Missing auto-rickshaw source asset: {AUTO_RICKSHAW_SOURCE}")
    existing = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=AUTO_RICKSHAW_SOURCE)
    imported = [obj for obj in bpy.data.objects if obj not in existing]
    # The source GLB contains one actual vehicle hierarchy rooted at Plane and
    # one large purple presentation disc. Only the vehicle belongs in-game.
    template = next((obj for obj in imported if obj.name.startswith("Plane") and obj.type == "MESH"), None)
    if template is None:
        raise RuntimeError("The auto-rickshaw GLB no longer contains its expected Plane vehicle root")
    keep = {template, *template.children_recursive}
    for obj in imported:
        if obj not in keep:
            bpy.data.objects.remove(obj, do_unlink=True)
    for obj in keep:
        base.move_to_collection(obj, collection)
    template.name = "AUTO_RICKSHAW_SOURCE_VISUAL"
    return template


def linked_hierarchy_copy(source, parent, collection, suffix):
    """Copy transforms/objects while sharing the source mesh and material data."""
    clone = source.copy()
    if getattr(source, "data", None) is not None:
        clone.data = source.data
    clone.name = f"Auto_asset_{suffix}_{source.name}"
    collection.objects.link(clone)
    clone.parent = parent
    for child in source.children:
        linked_hierarchy_copy(child, clone, collection, suffix)
    return clone


DISTRICTS = [
    {
        "root": "CITY_0_NIMBU_JUNCTION",
        "name": "Nimbu Junction",
        "center": (-252, -82),
        "walls": ["coral", "cream", "yellow", "blue", "teal"],
        "labels": ["STATION_HOTEL", "TICKET_OFFICE", "SCOOTER_STOP", "PARCEL_DEPOT", "JUNCTION_CAFE", "BUS_DEPOT", "SMALL_HOTEL"],
    },
    {
        "root": "CITY_1_NAMASTE_BAZAAR",
        "name": "Namaste Bazaar",
        "center": (-154, -37),
        "walls": ["yellow", "teal", "coral", "cream", "pink", "blue"],
        "labels": ["SPICE_SHOP", "BLUE_TAILOR", "BOOK_SHOP", "GREEN_LODGE", "FRUIT_MARKET", "CHAI_HOUSE", "SWEET_SHOP", "CLOTH_MARKET"],
    },
    {
        "root": "CITY_2_JHEEL_MANDIR",
        "name": "Jheel Mandir",
        "center": (-42, 27),
        "walls": ["cream", "yellow", "teal", "blue", "coral"],
        "labels": ["LAKE_LODGE", "BOAT_WORKSHOP", "HINDI_SCHOOL", "JHEEL_DHABA", "GHAT_HOUSE", "FLOWER_SHOP", "BOAT_CAFE"],
    },
    {
        "root": "CITY_3_HARIYALI_VILLAGE",
        "name": "Hariyali Village",
        "center": (78, -35),
        "walls": ["yellow", "cream", "teal", "coral", "blue"],
        "labels": ["VILLAGE_CLINIC", "PRIMARY_SCHOOL", "FARM_COOP", "DAIRY_SHOP", "HARIYALI_DHABA", "SEED_SHOP", "PANCHAYAT_HALL"],
    },
    {
        "root": "CITY_4_DEVGARH_FORT",
        "name": "Devgarh Fort",
        "center": (176, 45),
        "walls": ["earth_light", "cream", "coral", "yellow"],
        "labels": ["FORT_GUESTHOUSE", "ARCHAEOLOGY_OFFICE", "VIEW_CAFE", "CRAFT_WORKSHOP", "SOUVENIR_SHOP", "HILL_HOSTEL"],
    },
    {
        "root": "CITY_5_PAHADI_RAIL",
        "name": "Pahadi Rail",
        "center": (258, 105),
        "walls": ["teal", "cream", "pink", "yellow", "blue"],
        "labels": ["PAHADI_STATION", "CEDAR_GUESTHOUSE", "MOUNTAIN_POST", "TEMPLE_LODGE", "SUMMIT_HOUSE", "RAIL_CAFE", "PILGRIM_LODGE"],
    },
]


PATH_HALF_WIDTHS = {
    "main": 4.6,
    "main_walk": 1.35,
    "bazaar": 2.9,
    "lake": 2.7,
    "village": 3.2,
    "fort": 3.1,
    "mountain": 3.7,
    "south": 4.0,
    "rail": 3.4,
}
ROADSIDE_CLEARANCE = 1.6
PLAYABLE_GROUND_Z = 0.0


def terrain_height(_x, _y):
    """One authoritative elevation for every playable world surface.

    India, Japan, and Mexico share this builder. Keeping the base terrain
    level prevents the browser controller and authored roads from drifting
    apart over long journeys. Mountains remain scenery beyond the playable
    ground and roads/bridges keep their small intentional surface lifts.
    """
    return PLAYABLE_GROUND_Z


base.terrain_height = terrain_height


def create_terrain(root, collection):
    cols, rows = 180, 90
    min_x, max_x = -300.0, 300.0
    min_y, max_y = -150.0, 150.0
    vertices = []
    for row in range(rows + 1):
        y = min_y + (max_y - min_y) * row / rows
        for col in range(cols + 1):
            x = min_x + (max_x - min_x) * col / cols
            z = terrain_height(x, y)
            vertices.append((x, y, z))
    faces = []
    for row in range(rows):
        for col in range(cols):
            a = row * (cols + 1) + col
            b = a + 1
            c = a + cols + 1
            d = c + 1
            faces.extend(((a, b, d), (a, d, c)) if (row + col) % 2 == 0 else ((a, b, c), (b, d, c)))
    mesh = bpy.data.meshes.new("Nimbu_grand_terrain_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new("WALKABLE_GRAND_TERRAIN", mesh)
    collection.objects.link(obj)
    obj.parent = root
    obj.data.materials.append(MATS["grass"])
    obj["walkable"] = True

    # Keep the collision terrain a single material/named mesh. Multi-material
    # terrain exports as a Three.js Group and breaks the WALKABLE_* contract.
    # Two sparse overlay meshes provide the same low-poly tonal facets without
    # participating in collision or changing the base terrain hierarchy.
    facet_sets = {"LIGHT": ([], []), "DARK": ([], [])}
    for face_index, face in enumerate(faces):
        cell = face_index // 2
        row = cell // cols
        col = cell % cols
        triangle = face_index % 2
        signal = math.sin(col * 0.53 + triangle * 1.7) * 0.52 + math.cos(row * 0.67 - triangle * 0.9) * 0.48
        tone = "LIGHT" if signal > 0.72 else "DARK" if signal < -0.76 else None
        if tone is None:
            continue
        facet_vertices, facet_faces = facet_sets[tone]
        start = len(facet_vertices)
        facet_vertices.extend((vertices[index][0], vertices[index][1], vertices[index][2] + 0.035) for index in face)
        facet_faces.append((start, start + 1, start + 2))
    for tone, (facet_vertices, facet_faces) in facet_sets.items():
        facet_mesh = bpy.data.meshes.new(f"Terrain_facets_{tone.lower()}_mesh")
        facet_mesh.from_pydata(facet_vertices, [], facet_faces)
        facet_mesh.update()
        facet = bpy.data.objects.new(f"SCENERY_TERRAIN_FACETS_{tone}", facet_mesh)
        collection.objects.link(facet)
        facet.parent = root
        facet.data.materials.append(MATS[f"grand_grass_{tone.lower()}"])
        facet["terrain_detail"] = True
    return obj


def add_route_markers(parent, collection, prefix, controls):
    holder = base.empty(prefix + "_WAYPOINTS", (0, 0, 0), parent, collection)
    for index, (x, y) in enumerate(controls):
        marker = base.empty(
            f"{prefix}_{index:02d}",
            (x, y, terrain_height(x, y) + 0.25),
            holder,
            collection,
        )
        marker["route_index"] = index
    return holder


def path_half_width(path_name):
    if path_name.startswith("station_link_"):
        return 1.4
    return PATH_HALF_WIDTHS.get(path_name)


def roadside_edge_clearance(point, radius, protected_paths):
    point = Vector((point[0], point[1]))
    clearance = float("inf")
    for path_name, path in protected_paths.items():
        half_width = path_half_width(path_name)
        if half_width is None or not path:
            continue
        distance = min((point - Vector((sample[0], sample[1]))).length for sample in path)
        clearance = min(clearance, distance - half_width - radius)
    return clearance


def nearest_road_frame(desired, protected_paths):
    desired = Vector((desired[0], desired[1]))
    best = None
    for path_name in ("main", "bazaar", "lake", "village", "fort", "mountain", "south"):
        path = protected_paths.get(path_name, [])
        for index, sample in enumerate(path):
            point = Vector((sample[0], sample[1]))
            distance = (desired - point).length
            if best is None or distance < best[0]:
                previous = Vector((path[max(0, index - 1)][0], path[max(0, index - 1)][1]))
                following = Vector((path[min(len(path) - 1, index + 1)][0], path[min(len(path) - 1, index + 1)][1]))
                tangent = following - previous
                if tangent.length < 0.001:
                    tangent = Vector((1.0, 0.0))
                tangent.normalize()
                best = (distance, path_name, point, tangent)
    if best is None:
        raise RuntimeError("No road frame available for roadside placement")
    return best


def roadside_candidate_is_clear(candidate, radius, obstacle_specs, roadside_specs):
    if obstacle_specs and any(
        (candidate - Vector((center.x, center.y))).length < radius + other_radius + 1.4
        for _, center, other_radius in obstacle_specs
    ):
        return False
    if roadside_specs and any(
        (candidate - Vector((center.x, center.y))).length < radius + other_radius + 0.9
        for _, center, other_radius, _, _ in roadside_specs
    ):
        return False
    return True


def find_roadside_position(
    desired,
    radius,
    protected_paths,
    preferred_side=1,
    obstacle_specs=None,
    roadside_specs=None,
):
    desired = Vector((desired[0], desired[1]))
    _, path_name, road_point, tangent = nearest_road_frame(desired, protected_paths)
    normal = Vector((-tangent.y, tangent.x))
    desired_side = 1 if (desired - road_point).dot(normal) >= 0 else -1
    side_order = (desired_side, -desired_side) if desired_side else (preferred_side, -preferred_side)
    half_width = path_half_width(path_name)

    candidates = []
    for extra in (0.0, 2.5, 5.0, 8.0, 12.0, 17.0, 23.0, 30.0):
        distance = half_width + radius + ROADSIDE_CLEARANCE + extra
        for side in side_order:
            for tangent_shift in (0.0, -4.0, 4.0, -8.0, 8.0):
                candidate = road_point + normal * side * distance + tangent * tangent_shift
                if abs(candidate.x) > 292 or abs(candidate.y) > 142:
                    continue
                if not roadside_candidate_is_clear(candidate, radius, obstacle_specs, roadside_specs):
                    continue
                clearance = roadside_edge_clearance(candidate, radius, protected_paths)
                if clearance >= ROADSIDE_CLEARANCE:
                    score = (candidate - desired).length + extra * 0.12 + abs(tangent_shift) * 0.08
                    candidates.append((score, candidate, tangent, clearance))
        if candidates:
            break

    if not candidates:
        for ring in (12.0, 18.0, 25.0, 34.0, 44.0):
            for angle_index in range(32):
                angle = angle_index * math.tau / 32.0
                candidate = desired + Vector((math.cos(angle), math.sin(angle))) * ring
                if abs(candidate.x) > 292 or abs(candidate.y) > 142:
                    continue
                if not roadside_candidate_is_clear(candidate, radius, obstacle_specs, roadside_specs):
                    continue
                clearance = roadside_edge_clearance(candidate, radius, protected_paths)
                if clearance >= ROADSIDE_CLEARANCE:
                    score = (candidate - desired).length
                    candidates.append((score, candidate, tangent, clearance))
            if candidates:
                break

    if not candidates:
        raise RuntimeError(f"Could not place roadside prop safely near {tuple(desired)}")
    _, position, tangent, clearance = min(candidates, key=lambda item: item[0])
    return position.x, position.y, math.atan2(tangent.y, tangent.x), clearance


def mark_roadside(obj, radius, protected_paths, roadside_specs, category):
    point = Vector((obj.location.x, obj.location.y))
    clearance = roadside_edge_clearance(point, radius, protected_paths)
    obj["roadside_prop"] = True
    obj["roadside_category"] = category
    obj["road_edge_clearance_m"] = round(clearance, 3)
    roadside_specs.append((obj.name, point, radius, clearance, category))


def create_road_network(root, collection):
    road_root = base.empty("INDIA_VEHICLE_ROAD_NETWORK", (0, 0, 0), root, collection)
    details = base.empty("ROAD_SURFACE_DETAILS", (0, 0, 0), road_root, collection)

    def styled_road(name, path, width, material, lift, shoulder_material="stone"):
        base.create_ribbon(
            road_root,
            f"ROAD_SHOULDER_{name}",
            path,
            width + 1.45,
            MATS[shoulder_material],
            collection,
            lift - 0.035,
            False,
        )
        surface = base.create_ribbon(road_root, f"WALKABLE_{name}", path, width, material, collection, lift)
        for side in (-1, 1):
            edge = base.offset_path(path, side * (width * 0.5 - 0.15))
            base.create_ribbon(
                details,
                f"ROAD_EDGE_{name}_{'L' if side < 0 else 'R'}",
                edge,
                0.28,
                MATS["cream"],
                collection,
                lift + 0.035,
                False,
            )
        # Sparse stone-coloured repairs give the roads history and scale while
        # keeping the protected driving surface completely unobstructed.
        for patch_index in range(12, len(path) - 4, 27):
            x, y = path[patch_index]
            previous = Vector(path[max(0, patch_index - 2)])
            following = Vector(path[min(len(path) - 1, patch_index + 2)])
            tangent = following - previous
            angle = math.atan2(tangent.y, tangent.x)
            patch = base.box(
                details,
                f"BATCH_ROAD_REPAIR_{name}_{patch_index:03d}",
                (x, y, terrain_height(x, y) + lift + 0.052),
                (1.9, 0.48, 0.035),
                MATS["road_light"],
                0.12,
            )
            patch.rotation_euler[2] = angle
        return surface

    main_controls = [
        (-281, -105), (-252, -82), (-216, -66), (-180, -48), (-145, -31),
        (-104, -4), (-57, 20), (-8, 15), (38, -2), (82, -34),
        (124, -17), (163, 19), (190, 54), (222, 79), (258, 105), (286, 126),
    ]
    main = base.sample_path(main_controls, 12)
    styled_road("GRAND_MAIN_ROAD", main, 9.2, MATS["road"], 0.10)
    base.create_ribbon(road_root, "ROAD_GRAND_CENTER_PAINT", main, 0.18, MATS["yellow"], collection, 0.14, False)
    main_walk = base.offset_path(main, -6.6)
    styled_road("GRAND_MAIN_FOOTPATH", main_walk, 2.7, MATS["stone_light"], 0.16, "earth_light")

    bazaar_controls = [(-180, -48), (-170, -28), (-151, -19), (-132, -29), (-126, -48), (-145, -58), (-166, -55)]
    bazaar = base.sample_path(bazaar_controls, 9)
    styled_road("GRAND_BAZAAR_LANE", bazaar, 5.8, MATS["road_light"], 0.11, "earth_light")

    lake_controls = [(-70, 18), (-64, 42), (-45, 55), (-20, 52), (-8, 31), (-20, 11), (-46, 6), (-64, 18)]
    lake = base.sample_path(lake_controls, 9)
    styled_road("GRAND_LAKE_PROMENADE", lake, 5.4, MATS["road_light"], 0.12)

    village_controls = [(46, -5), (60, -28), (78, -45), (101, -43), (116, -23), (124, -17)]
    village = base.sample_path(village_controls, 9)
    styled_road("GRAND_VILLAGE_ROAD", village, 6.4, MATS["earth_light"], 0.10, "earth")

    fort_controls = [(151, 7), (145, 28), (160, 46), (181, 39), (196, 55), (188, 72), (207, 84)]
    fort = base.sample_path(fort_controls, 10)
    styled_road("GRAND_FORT_ZIGZAG", fort, 6.2, MATS["stone_light"], 0.12)

    mountain_controls = [(190, 54), (209, 62), (222, 79), (236, 89), (248, 105), (260, 119), (274, 130)]
    mountain = base.sample_path(mountain_controls, 10)
    styled_road("GRAND_MOUNTAIN_ROAD", mountain, 7.4, MATS["road"], 0.13)

    south_controls = [(-252, -82), (-210, -118), (-145, -128), (-72, -112), (0, -92), (76, -91), (139, -74), (181, -40), (163, 19)]
    south = base.sample_path(south_controls, 11)
    styled_road("GRAND_SOUTHERN_HIGHWAY", south, 8.0, MATS["earth_light"], 0.10, "earth")
    base.create_ribbon(road_root, "ROAD_GRAND_SOUTH_PAINT", south, 0.15, MATS["cream"], collection, 0.14, False)

    add_route_markers(road_root, collection, "ROAD_ROUTE", main_controls)
    return {
        "main": main,
        "main_walk": main_walk,
        "bazaar": bazaar,
        "lake": lake,
        "village": village,
        "fort": fort,
        "mountain": mountain,
        "south": south,
    }, main_controls


def create_lake(root, collection):
    lake = base.empty("SCENERY_JHEEL_LAKE", (-39, 31, terrain_height(-39, 31)), root, collection)
    base.ico(lake, "SCENERY_LAKE_WATER", (0, 0, 0.22), 1, MATS["water"], 2, (25, 17, 0.22))
    island = base.empty("DISCOVERY_ISLAND_SHRINE", (0, 0, 0.30), lake, collection)
    island["discovery_name"] = "The island shrine"
    island["reward"] = 35
    base.cylinder(island, "Shrine_island", (0, 0, 0.12), 4.2, 0.35, MATS["stone_light"], 18)
    for side in (-1, 1):
        base.cylinder(island, f"Shrine_column_{side}", (side * 1.2, 0, 1.6), 0.25, 2.7, MATS["cream"], 10)
    base.box(island, "Shrine_roof", (0, 0, 3.0), (4.2, 3.4, 0.34), MATS["saffron"], 0.10)
    bridge_points = base.sample_path([(-66, 30), (-57, 31), (-48, 31), (-42, 31)], 4)
    base.create_ribbon(root, "WALKABLE_GRAND_LAKE_BRIDGE", bridge_points, 2.8, MATS["wood"], collection, 0.54)


def find_clear_building_position(center, index, radius, protected_paths, obstacle_specs):
    cx, cy = center
    route_points = [Vector(point) for path in protected_paths.values() for point in path]
    for ring in (13.0, 16.0, 19.0, 22.0, 26.0, 30.0):
        for angle_step in range(18):
            angle = (index * 1.83 + angle_step * math.tau / 18.0) % math.tau
            candidate = Vector((cx + math.cos(angle) * ring, cy + math.sin(angle) * ring))
            route_clearance = min((candidate - point).length for point in route_points) - radius
            if route_clearance < 3.35:
                continue
            if any((candidate - other_center).length < radius + other_radius + 2.4 for _, other_center, other_radius in obstacle_specs):
                continue
            return candidate.x, candidate.y
    raise RuntimeError(f"Could not place building {index} safely near {center}")


def create_district(root, collection, district, obstacle_specs, protected_paths, roadside_specs):
    cx, cy = district["center"]
    district_root = base.empty(district["root"], (0, 0, 0), root, collection)
    district_root["district_name"] = district["name"]
    district_root["map_x"] = cx
    district_root["map_y"] = cy
    labels = district["labels"]
    for index, label in enumerate(labels):
        width = 7.4 + (index % 2) * 1.1
        depth = 5.6 + (index % 3) * 0.35
        radius = max(width, depth) * 0.56
        px, py = find_clear_building_position((cx, cy), index, radius, protected_paths, obstacle_specs)
        spec = {
            "name": label,
            "position": (px, py),
            "size": (width, depth),
            "floors": 2 if index in (0, 3) else 1,
            "wall": district["walls"][index % len(district["walls"])],
            "roof": ("teal", "cream", "coral", "teal_dark")[index % 4],
            "awning": ("yellow", "pink", "saffron", "cream")[index % 4],
        }
        building = base.create_building(district_root, collection, spec, obstacle_specs)
        # Every shopfront gets real exported mesh lettering. The original
        # awnings looked like empty signboards in the browser because the
        # building helper only authored the coloured panel.
        readable_label = label.replace("_", " ")
        front_y = -depth * 0.51
        board_width = min(width * 0.78, 5.8)
        base.box(
            building,
            f"{label}_name_board",
            (0, front_y - 0.16, 2.44),
            (board_width, 0.16, 0.56),
            MATS["teal_dark"],
            0.05,
        )
        label_size = min(0.28, max(0.16, 4.4 / max(8, len(readable_label))))
        base.text_mesh(
            building,
            f"{label}_name_text",
            readable_label,
            (0, front_y - 0.26, 2.45),
            label_size,
            MATS["white"],
        )

    sign_x, sign_y, sign_angle, _ = find_roadside_position(
        (cx - 5, cy - 3), 3.0, protected_paths, obstacle_specs=obstacle_specs, roadside_specs=roadside_specs
    )
    sign = base.empty(f"SIGN_{district['root']}", (sign_x, sign_y, terrain_height(sign_x, sign_y)), district_root, collection)
    sign.rotation_euler[2] = sign_angle
    sign["hindi"] = {
        "Nimbu Junction": "निंबू जंक्शन",
        "Namaste Bazaar": "नमस्ते बाज़ार",
        "Jheel Mandir": "झील मंदिर",
        "Hariyali Village": "हरियाली गाँव",
        "Devgarh Fort": "देवगढ़ किला",
        "Pahadi Rail": "पहाड़ी रेल",
    }[district["name"]]
    sign["english"] = district["name"]
    sign["prompt"] = "Read this Hindi sign"
    base.box(sign, f"{district['root']}_sign_board", (0, 0, 2.2), (5.6, 0.28, 2.2), MATS["teal_dark"], 0.12)
    base.text_mesh(sign, f"{district['root']}_sign_text", sign["hindi"], (0, -0.20, 2.42), 0.34, MATS["white"])
    base.text_mesh(sign, f"{district['root']}_sign_text_en", district["name"].upper(), (0, -0.20, 1.98), 0.25, MATS["yellow"])
    for side in (-1, 1):
        base.box(sign, f"{district['root']}_sign_post_{side}", (side * 2.2, 0, 1.0), (0.22, 0.22, 2.1), MATS["wood"], 0.04)
    mark_roadside(sign, 3.0, protected_paths, roadside_specs, "district_sign")
    return district_root


def create_stylized_person(parent, name, style_index=0, guide=False):
    """Create a player-quality low-poly Indian NPC with distinct clothing."""
    visual = base.empty(f"{name}_VISUAL", (0, 0, 0), parent, parent.users_collection[0])
    outfit_names = ("blue", "coral", "yellow", "teal", "pink", "saffron")
    accent_names = ("yellow", "teal", "coral", "cream", "blue", "pink")
    outfit = MATS[outfit_names[style_index % len(outfit_names)]]
    accent = MATS[accent_names[(style_index + 2) % len(accent_names)]]

    # Separate pivots keep Asha and roaming locals animation-ready in Three.js.
    base.cylinder(visual, f"{name}_torso", (0, 0, 1.58), 0.40, 1.12, outfit, 10)
    base.ico(visual, f"{name}_head", (0, 0, 2.43), 0.47, MATS["skin"], 2, (0.93, 0.88, 1.04))
    base.ico(visual, f"{name}_hair_cap", (0, 0.04, 2.70), 0.43, MATS["ink"], 2, (1.0, 0.88, 0.68))
    for hair_index in range(3):
        hx = (hair_index - 1) * 0.20
        base.ico(visual, f"{name}_hair_{hair_index}", (hx, -0.18, 2.78 + abs(hx) * 0.16), 0.18, MATS["ink"], 1, (0.78, 0.72, 1.18))
    for side in (-1, 1):
        base.ico(visual, f"{name}_eye_white_{side}", (side * 0.15, -0.40, 2.47), 0.085, MATS["white"], 1, (1.0, 0.42, 1.15))
        base.ico(visual, f"{name}_eye_{side}", (side * 0.15, -0.445, 2.47), 0.040, MATS["ink"], 1, (1.0, 0.38, 1.1))
        arm = base.empty(f"{name}_arm_{side}", (side * 0.47, 0, 1.92), visual, parent.users_collection[0])
        base.cylinder(arm, f"{name}_arm_mesh_{side}", (0, 0, -0.40), 0.14, 0.86, MATS["skin"], 9)
        base.ico(arm, f"{name}_hand_{side}", (0, 0, -0.84), 0.15, MATS["skin"], 1)
        leg = base.empty(f"{name}_leg_{side}", (side * 0.22, 0, 1.04), visual, parent.users_collection[0])
        base.cylinder(leg, f"{name}_leg_mesh_{side}", (0, 0, -0.44), 0.18, 0.92, MATS["pants"], 9)
        base.box(leg, f"{name}_shoe_{side}", (0, -0.11, -0.94), (0.40, 0.60, 0.24), accent, 0.09)

    if guide:
        # Asha is immediately recognisable by her saffron dupatta, side bag,
        # and hair bun, while still sharing the player's proportions.
        base.box(visual, f"{name}_dupatta", (0.17, -0.34, 1.58), (0.20, 0.10, 1.24), MATS["saffron"], 0.05, (0, 0, -0.12))
        base.box(visual, f"{name}_satchel", (-0.43, 0.18, 1.25), (0.42, 0.28, 0.55), MATS["wood"], 0.10)
        base.ico(visual, f"{name}_hair_bun", (0.30, 0.06, 2.80), 0.22, MATS["ink"], 1)
    elif style_index % 3 == 0:
        base.box(visual, f"{name}_vest", (0, -0.36, 1.62), (0.48, 0.10, 0.78), accent, 0.04)
    elif style_index % 3 == 1:
        base.box(visual, f"{name}_scarf", (0.20, -0.34, 1.67), (0.16, 0.09, 0.86), accent, 0.04, (0, 0, -0.14))
    else:
        base.box(visual, f"{name}_apron", (0, -0.36, 1.45), (0.52, 0.09, 0.85), MATS["cream"], 0.04)
    return visual


def create_named_interactions(root, collection, protected_paths, obstacle_specs, roadside_specs):
    definitions = [
        ("INTERACT_LOCAL_FRIEND", (-248, -69), "Practise a friendly greeting", "practice_greeting", "नमस्ते! आप कैसे हैं?", "Hello! How are you?"),
        ("INTERACT_TICKET_CLERK", (-259, -72), "Practise buying a train ticket", "practice_train", "आप कहाँ जाना चाहते हैं?", "Where would you like to go?"),
        ("INTERACT_SCOOTER_GUIDE", (-239, -91), "Ask about the free scooters", "scooter_tip", "क्या मैं यह स्कूटर ले सकता हूँ?", "May I take this scooter?"),
        ("INTERACT_CHAI_VENDOR", (-150, -49), "Practise ordering food", "practice_food", "नमस्ते! आप क्या लेंगे?", "Hello! What would you like?"),
        ("INTERACT_FRUIT_VENDOR", (-137, -24), "Practise shopping for fruit", "practice_shop", "नमस्ते! आपको क्या चाहिए?", "Hello! What do you need?"),
        ("INTERACT_BOATMAN", (-62, 34), "Talk to the boatman", "ambient_talk", "नाव की सवारी सुंदर है।", "The boat ride is beautiful."),
        ("INTERACT_DIRECTIONS_LOCAL", (-24, 20), "Practise asking for directions", "practice_directions", "नमस्ते, क्या मैं आपकी मदद करूँ?", "Hello, may I help you?"),
        ("INTERACT_PHARMACIST", (64, -47), "Practise speaking at a pharmacy", "practice_pharmacy", "नमस्ते, आपको क्या परेशानी है?", "Hello, what is troubling you?"),
        ("INTERACT_FORT_GUIDE", (165, 54), "Ask about the fort", "ambient_talk", "यह किला बहुत पुराना है।", "This fort is very old."),
        ("INTERACT_TEMPLE_BELL", (251, 116), "Ring the temple bell", "ring_bell", "मंदिर की घंटी", "The temple bell"),
        ("INTERACT_PAHADI_STATION", (265, 94), "Talk to the station master", "ambient_talk", "ट्रेन थोड़ी देर में आएगी।", "The train will arrive shortly."),
        ("INTERACT_PARCEL_DEPOT", (-267, -91), "Talk to the post-office clerk", "ambient_talk", "डाकघर सुबह खुलता है।", "The post office opens in the morning."),
    ]
    speaker_names = {
        "INTERACT_LOCAL_FRIEND": "Ravi",
        "INTERACT_TICKET_CLERK": "Sanjay",
        "INTERACT_SCOOTER_GUIDE": "Kabir",
        "INTERACT_CHAI_VENDOR": "Meera",
        "INTERACT_FRUIT_VENDOR": "Arjun",
        "INTERACT_BOATMAN": "Mohan",
        "INTERACT_DIRECTIONS_LOCAL": "Kavita",
        "INTERACT_PHARMACIST": "Neha",
        "INTERACT_FORT_GUIDE": "Deepak",
        "INTERACT_PAHADI_STATION": "Tenzin",
        "INTERACT_PARCEL_DEPOT": "Farah",
    }
    for index, (name, desired, prompt, action, hi, en) in enumerate(definitions):
        npc_radius = 0.65
        x, y, angle, _ = find_roadside_position(
            desired, npc_radius, protected_paths, -1 if index % 2 else 1, obstacle_specs, roadside_specs
        )
        item = base.empty(name, (x, y, terrain_height(x, y)), root, collection)
        item.rotation_euler[2] = angle
        item["prompt"] = prompt
        item["action"] = action
        item["dialogue_hi"] = hi
        item["dialogue_en"] = en
        item["speaker_name"] = speaker_names.get(name, name.replace("INTERACT_", "").replace("_", " ").title())
        item["lesson_target"] = action.startswith("practice_")
        if name == "INTERACT_TEMPLE_BELL":
            base.cylinder(item, "Temple_bell", (0, 0, 1.70), 0.34, 0.52, MATS["yellow"], 12)
            base.box(item, "Temple_bell_frame", (0, 0, 2.32), (1.25, 0.25, 0.20), MATS["wood"], 0.04)
            for side in (-1, 1):
                base.box(item, f"Temple_bell_post_{side}", (side * 0.52, 0, 1.15), (0.16, 0.16, 2.35), MATS["wood"], 0.03)
        else:
            create_stylized_person(item, name.replace("INTERACT_", "NPC_"), index)
        mark_roadside(item, npc_radius, protected_paths, roadside_specs, "interaction")


def create_train(root, collection):
    # The railway deliberately avoids the inter-city road. It first follows the
    # far-west forest edge, then traverses the quiet northern ridge to Pahadi.
    controls = [
        (-289, -116), (-292, -92), (-291, -58), (-286, -18), (-278, 24),
        (-266, 62), (-244, 96), (-210, 119), (-164, 132), (-112, 136),
        (-58, 132), (-4, 126), (48, 131), (101, 139), (151, 138),
        (194, 134), (224, 128), (247, 120), (265, 111),
    ]
    track_path = base.sample_path(controls, 14)
    track = base.empty("RAILWAY_CORRIDOR", (0, 0, 0), root, collection)
    track["corridor_type"] = "forest_railway"
    base.create_ribbon(track, "RAIL_FOREST_BALLAST", track_path, 3.6, MATS["stone_light"], collection, 0.34, False)
    for side in (-1, 1):
        base.create_ribbon(track, f"RAIL_TRACK_{side}", base.offset_path(track_path, side * 1.05), 0.18, MATS["rail"], collection, 0.52, False)
    for index in range(0, len(track_path), 4):
        point = Vector(track_path[index])
        previous = Vector(track_path[max(0, index - 1)])
        following = Vector(track_path[min(len(track_path) - 1, index + 1)])
        tangent = (following - previous).normalized()
        base.box(track, f"BATCH_SLEEPER_{index:03d}", (point.x, point.y, terrain_height(point.x, point.y) + 0.39), (0.36, 3.0, 0.18), MATS["wood"], 0.02, (0, 0, math.atan2(tangent.y, tangent.x)))
    add_route_markers(root, collection, "TRAIN_ROUTE", controls)

    # Scenic bridge across the northern gorge.
    bridge = base.empty("RAIL_FEATURE_FOREST_GORGE_BRIDGE", (0, 0, 0), root, collection)
    bridge_path = base.sample_path([(-30, 128), (10, 127), (48, 131), (80, 136)], 8)
    base.create_ribbon(bridge, "RAIL_BRIDGE_DECK", bridge_path, 4.3, MATS["stone"], collection, 0.18, False)
    for index, (x, y) in enumerate(bridge_path[::7]):
        base.cylinder(bridge, f"Rail_bridge_pier_{index}", (x, y, terrain_height(x, y) - 1.8), 0.85, 5.2, MATS["stone"], 10)
    river_path = base.sample_path([(-25, 145), (5, 132), (20, 118), (42, 104)], 8)
    base.create_ribbon(root, "SCENERY_FOREST_RIVER", river_path, 4.4, MATS["water"], collection, -0.15, False)

    # A visible rock tunnel frames the final approach without blocking the rail.
    tunnel = base.empty("RAIL_FEATURE_MOUNTAIN_TUNNEL", (224, 128, terrain_height(224, 128)), root, collection)
    tunnel["discovery_name"] = "Pahadi rail tunnel"
    for index, (ox, oy, oz, sx, sy, sz) in enumerate((
        (-3.0, 0, 2.5, 2.4, 3.0, 4.8),
        (3.0, 0, 2.5, 2.4, 3.0, 4.8),
        (0, 0, 5.6, 5.2, 3.0, 1.9),
    )):
        base.ico(tunnel, f"Tunnel_rock_{index}", (ox, oy, oz), 1, MATS["stone"], 2, (sx, sy, sz))

    # Safety fencing keeps walking routes visually distinct from the rail line.
    for side in (-1, 1):
        fence_path = base.offset_path(track_path, side * 3.3)
        for index in range(0, len(fence_path), 10):
            point = Vector(fence_path[index])
            base.box(track, f"BATCH_RAIL_FENCE_{side}_{index:03d}", (point.x, point.y, terrain_height(point.x, point.y) + 0.65), (0.16, 0.16, 1.3), MATS["wood"], 0.03)

    start_x, start_y = controls[0]
    train = base.empty("TOY_TRAIN", (start_x, start_y, terrain_height(start_x, start_y) + 1.05), root, collection)
    train["speed_mps"] = 19.0
    for car_index in range(5):
        car = base.empty(f"Train_car_{car_index}", (-car_index * 5.25, 0, 0), train, collection)
        color = ("coral", "teal", "yellow", "blue", "pink")[car_index]
        base.box(car, f"Train_car_body_{car_index}", (0, 0, 1.35), (4.65, 2.35, 2.15), MATS[color], 0.24)
        base.box(car, f"Train_car_roof_{car_index}", (0, 0, 2.58), (4.95, 2.58, 0.34), MATS["cream"], 0.14)
        if car_index > 0:
            door = base.box(car, f"TRAIN_DOOR_{car_index:02d}", (0.25, -1.22, 1.38), (1.15, 0.14, 1.70), MATS["cream"], 0.05)
            door["train_door"] = True
        for side in (-1, 1):
            for axle in (-1.5, 1.5):
                base.cylinder(car, f"Train_wheel_{car_index}_{side}_{axle}", (axle, side * 1.10, 0.36), 0.48, 0.24, MATS["rail"], 12, (math.radians(90), 0, 0))
    base.cylinder(train, "Train_engine_stack", (1.3, 0, 3.30), 0.34, 1.10, MATS["rail"], 10)
    seat = base.empty("TRAIN_PLAYER_SEAT", (-5.25, 0, 1.25), train, collection)
    seat["vehicle_seat"] = True
    exit_point = base.empty("TRAIN_EXIT_POINT", (-5.25, -2.2, 0.2), train, collection)
    exit_point["vehicle_exit"] = True

    stop_definitions = [
        ((-289, -105), "Nimbu Junction", "निंबू जंक्शन", (-256, -83)),
        ((-273, 48), "Deodar Forest Halt", "देवदार वन हॉल्ट", (-240, 30)),
        ((-77, 134), "Jheel Trail", "झील पगडंडी", (-45, 58)),
        ((151, 138), "Devgarh Trail", "देवगढ़ पगडंडी", (176, 70)),
        ((258, 115), "Pahadi Rail", "पहाड़ी रेल", (258, 105)),
    ]
    station_links = {}
    for index, ((x, y), stop_name, stop_name_hi, (link_x, link_y)) in enumerate(stop_definitions):
        stop = base.empty(f"TRAIN_STOP_{index:02d}", (x, y, terrain_height(x, y) + 0.2), root, collection)
        stop["stop_index"] = index
        stop["stop_name"] = stop_name
        stop["announcement_hi"] = f"अगला स्टेशन {stop_name_hi}"
        base.box(stop, f"Train_stop_platform_{index}", (0, -4.0, 0.25), (19, 4.0, 0.50), MATS["stone_light"], 0.08)
        zone = base.empty(f"TRAIN_BOARDING_ZONE_{index:02d}", (0, -3.8, 0.55), stop, collection)
        zone["boarding_zone"] = True
        base.box(zone, f"Boarding_zone_mark_{index}", (0, 0, 0), (7.5, 0.25, 0.05), MATS["yellow"], 0.02)
        sign = base.empty(f"SIGN_TRAIN_STOP_{index:02d}", (0, -5.4, 0.0), stop, collection)
        sign["hindi"] = f"रेलवे स्टेशन · {stop_name_hi}"
        sign["english"] = stop_name
        sign["prompt"] = "Read the station sign"
        base.box(sign, f"Station_sign_board_{index}", (0, 0, 2.0), (5.8, 0.28, 1.8), MATS["teal_dark"], 0.08)
        base.text_mesh(sign, f"Station_sign_hindi_{index}", stop_name_hi, (0, -0.20, 2.27), 0.34, MATS["white"])
        english_size = min(0.30, 4.4 / max(10, len(stop_name)))
        base.text_mesh(sign, f"Station_sign_english_{index}", stop_name.upper(), (0, -0.20, 1.78), english_size, MATS["yellow"])
        link_controls = [(x, y - 5), ((x + link_x) * 0.5, (y + link_y) * 0.5), (link_x, link_y)]
        link_path = base.sample_path(link_controls, 9)
        base.create_ribbon(root, f"WALKABLE_STATION_LINK_{index:02d}", link_path, 2.8, MATS["stone_light"], collection, 0.15)
        station_links[f"station_link_{index}"] = link_path

    # Dedicated gated crossings only at the two terminal approaches.
    for index, (x, y) in enumerate(((-288, -105), (257, 115))):
        crossing = base.empty(f"RAIL_CROSSING_{index:02d}", (x, y, terrain_height(x, y)), root, collection)
        crossing["crossing_type"] = "gated"
        for side in (-1, 1):
            base.box(crossing, f"Crossing_post_{index}_{side}", (side * 4.0, -3.0, 1.2), (0.22, 0.22, 2.4), MATS["cream"], 0.03)
            base.box(crossing, f"Crossing_barrier_{index}_{side}", (side * 1.8, -3.0, 2.15), (4.5, 0.16, 0.16), MATS["coral"], 0.03)

    return track_path, station_links


def create_scooter_and_traffic(root, collection, protected_paths, obstacle_specs, roadside_specs):
    scooter_positions = [
        (-238, -88), (-171, -58), (-67, 17), (47, -7), (151, 8), (244, 98),
    ]
    scooter_colors = ("saffron", "coral", "teal", "yellow", "blue", "pink")
    for index, desired in enumerate(scooter_positions):
        x, y, angle, _ = find_roadside_position(
            desired, 2.35, protected_paths, -1 if index % 2 else 1, obstacle_specs, roadside_specs
        )
        name = "SCOOTER" if index == 0 else f"SCOOTER_DISTRICT_{index:02d}"
        scooter = base.empty(name, (x, y, terrain_height(x, y) + 0.55), root, collection)
        scooter.rotation_euler[2] = angle
        scooter["vehicle_type"] = "scooter"
        scooter["free_to_ride"] = True
        scooter["home_district"] = DISTRICTS[index]["name"]
        base.box(scooter, f"Scooter_body_{index}", (0, 0, 0.65), (1.8, 0.55, 0.48), MATS[scooter_colors[index]], 0.18)
        base.box(scooter, f"Scooter_seat_{index}", (-0.25, 0, 1.02), (0.82, 0.52, 0.20), MATS["ink"], 0.09)
        base.box(scooter, f"Scooter_handle_{index}", (0.72, 0, 1.35), (0.16, 1.05, 0.14), MATS["rail"], 0.04)
        for side, wheel_x in (("front", 0.68), ("rear", -0.68)):
            base.cylinder(scooter, f"Scooter_wheel_{index}_{side}", (wheel_x, 0, 0.34), 0.36, 0.18, MATS["rail"], 14, (math.radians(90), 0, 0))
        base.empty("SCOOTER_DRIVER_SEAT", (-0.2, 0, 1.08), scooter, collection)
        base.empty("SCOOTER_EXIT_POINT", (-0.4, -1.25, 0.0), scooter, collection)
        pad = base.empty(f"SCOOTER_PARKING_{index:02d}", (x, y, terrain_height(x, y) + 0.10), root, collection)
        pad.rotation_euler[2] = angle
        pad["parking_label"] = "FREE RIDE"
        base.box(pad, f"Scooter_pad_{index}", (0, 0, 0), (4.2, 2.6, 0.12), MATS["stone_light"], 0.08)
        base.text_mesh(pad, f"Scooter_free_text_{index}", "FREE", (-1.2, -1.33, 0.12), 0.32, MATS["teal_dark"])
        mark_roadside(pad, 2.35, protected_paths, roadside_specs, "scooter_parking")

    auto_template = import_auto_rickshaw_template(collection)
    # The downloaded GLB uses a corrective, non-uniform root scale to restore
    # the tuk-tuk's authored proportions. Preserve it: replacing this with a
    # uniform scale stretches the vehicle nearly fourfold from front to back.
    authored_auto_scale = auto_template.scale.copy()
    for index, (x, y) in enumerate(((-105, -4), (39, -2), (164, 19))):
        auto = base.empty(f"AUTO_RICKSHAW_{index}", (x, y, terrain_height(x, y) + 0.55), root, collection)
        auto["route_offset"] = index * 0.29
        if index == 0:
            visual = auto_template
            visual.parent = auto
        else:
            visual = linked_hierarchy_copy(auto_template, auto, collection, f"{index:02d}")
        visual.scale = authored_auto_scale * 1.06
        auto["source_asset"] = "indian_auto_rickshaw.glb"
        auto["shared_mesh_instance"] = True
        auto["dynamic_obstacle"] = True


def create_people_and_animals(root, collection, protected_paths, obstacle_specs, roadside_specs):
    npc_positions = [
        (-244, -70), (-168, -36), (-142, -28), (-52, 45), (-24, 20),
        (65, -31), (91, -45), (166, 37), (188, 55), (245, 96), (268, 112),
    ]
    for index, desired in enumerate(npc_positions):
        routine_radius = 5 + index % 4
        x, y, angle, _ = find_roadside_position(
            desired, routine_radius + 0.55, protected_paths, -1 if index % 2 else 1, obstacle_specs, roadside_specs
        )
        npc = base.empty(f"NPC_ROUTINE_{index:02d}", (x, y, terrain_height(x, y)), root, collection)
        npc.rotation_euler[2] = angle
        npc["routine_radius"] = routine_radius
        npc["routine_speed"] = 0.55 + (index % 3) * 0.18
        npc["dialogue_hi"] = ("नमस्ते!", "आप कैसे हैं?", "स्टेशन उधर है।", "आज मौसम अच्छा है।")[index % 4]
        npc["dialogue_en"] = ("Hello!", "How are you?", "The station is that way.", "The weather is lovely today.")[index % 4]
        create_stylized_person(npc, f"ROAMING_NPC_{index:02d}", index + 2)
        mark_roadside(npc, routine_radius + 0.55, protected_paths, roadside_specs, "npc_routine")

    for index, desired in enumerate(((-204, -78), (-118, -7), (47, -56), (106, -18), (203, 68), (230, 88))):
        x, y, angle, _ = find_roadside_position(
            desired, 7.8, protected_paths, 1 if index % 2 else -1, obstacle_specs, roadside_specs
        )
        animal = base.empty(f"ANIMAL_GOAT_{index:02d}", (x, y, terrain_height(x, y)), root, collection)
        animal.rotation_euler[2] = angle
        animal["routine_radius"] = 7.0
        animal["routine_speed"] = 0.75
        base.box(animal, f"Goat_body_{index}", (0, 0, 0.65), (1.25, 0.55, 0.72), MATS["white"], 0.20)
        base.ico(animal, f"Goat_head_{index}", (0.62, 0, 0.92), 0.34, MATS["cream"], 1)
        for leg in (-0.4, 0.4):
            for side in (-1, 1):
                base.cylinder(animal, f"Goat_leg_{index}_{leg}_{side}", (leg, side * 0.18, 0.25), 0.07, 0.50, MATS["ink"], 7)
        mark_roadside(animal, 7.8, protected_paths, roadside_specs, "animal_routine")


def create_discoveries_collectibles_and_festival(root, collection, protected_paths, obstacle_specs, roadside_specs):
    discoveries = [
        ("DISCOVERY_HIDDEN_CAVE", (142, 93), "The echo cave", 45),
        ("DISCOVERY_FORT_VIEWPOINT", (207, 84), "Devgarh sunset point", 40),
        ("DISCOVERY_ROOFTOP_GARDEN", (-145, -18), "Bazaar rooftop garden", 30),
        ("DISCOVERY_WATERFALL", (224, 119), "Pahadi waterfall", 55),
        ("DISCOVERY_OLD_BANYAN", (101, -70), "The old banyan tree", 35),
    ]
    for index, (name, desired, label, reward) in enumerate(discoveries):
        discovery_radius = 7.0 if "CAVE" in name else 4.2 if "WATERFALL" in name else 1.4
        x, y, angle, _ = find_roadside_position(
            desired, discovery_radius, protected_paths, -1 if index % 2 else 1, obstacle_specs, roadside_specs
        )
        discovery = base.empty(name, (x, y, terrain_height(x, y)), root, collection)
        discovery.rotation_euler[2] = angle
        discovery["discovery_name"] = label
        discovery["reward"] = reward
        if "CAVE" in name:
            base.ico(discovery, f"Cave_rock_{index}", (0, 0, 2.8), 1, MATS["stone"], 2, (6.5, 3.6, 4.5))
            base.ico(discovery, f"Cave_mouth_{index}", (0, -3.1, 1.7), 1, MATS["ink"], 2, (2.1, 0.5, 2.2))
        elif "WATERFALL" in name:
            base.box(discovery, f"Waterfall_{index}", (0, 0, 4), (3.5, 0.35, 8.0), MATS["water"], 0.12)
        else:
            base.cylinder(discovery, f"Discovery_marker_{index}", (0, 0, 1.4), 0.45, 2.8, MATS["saffron"], 10)
        mark_roadside(discovery, discovery_radius, protected_paths, roadside_specs, "discovery")

    postcards = [(-268, -76), (-159, -21), (-28, 48), (68, -52), (187, 59), (268, 118), (11, -96), (147, 12)]
    phrases = ["नमस्ते", "कितने का है?", "स्टेशन कहाँ है?", "मदद कीजिए", "बहुत सुंदर", "फिर मिलेंगे", "धन्यवाद", "मुझे हिंदी सीखनी है"]
    for index, (desired, phrase) in enumerate(zip(postcards, phrases)):
        x, y, angle, _ = find_roadside_position(
            desired, 0.8, protected_paths, -1 if index % 2 else 1, obstacle_specs, roadside_specs
        )
        card = base.empty(f"COLLECTIBLE_POSTCARD_{index:02d}", (x, y, terrain_height(x, y) + 1.0), root, collection)
        card.rotation_euler[2] = angle
        card["phrase_hi"] = phrase
        card["phrase_en"] = ("Hello", "How much is it?", "Where is the station?", "Please help", "Very beautiful", "See you again", "Thank you", "I want to learn Hindi")[index]
        card["reward"] = 10
        base.box(card, f"Postcard_mesh_{index}", (0, 0, 0), (1.15, 0.12, 0.78), MATS[("coral", "yellow", "teal")[index % 3]], 0.08, (0, 0, math.radians(index * 17)))
        mark_roadside(card, 0.8, protected_paths, roadside_specs, "collectible")

    festival_x, festival_y, festival_angle, _ = find_roadside_position(
        (-12, 64), 13.0, protected_paths, 1, obstacle_specs, roadside_specs
    )
    festival = base.empty("FESTIVAL_GROUP", (festival_x, festival_y, terrain_height(festival_x, festival_y)), root, collection)
    festival.rotation_euler[2] = festival_angle
    festival["event_name"] = "Jheel Deepotsav"
    plaza = base.box(festival, "Festival_plaza", (0, 0, 0.08), (21, 15, 0.16), MATS["stone_light"], 0.20)
    plaza["festival_only"] = True
    for ring in range(3):
        radius = 4 + ring * 3
        for index in range(12):
            angle = index * math.tau / 12
            lamp = base.cylinder(festival, f"FESTIVAL_LIGHT_{ring}_{index}", (math.cos(angle) * radius, math.sin(angle) * radius, 0.35), 0.18, 0.55, MATS["yellow"], 8)
            lamp["festival_light"] = True
    stage = base.box(festival, "Festival_stage", (0, 7.5, 0.35), (9, 3.5, 0.70), MATS["saffron"], 0.12)
    stage["festival_only"] = True
    mark_roadside(festival, 13.0, protected_paths, roadside_specs, "festival_plaza")


def create_route_landmarks_and_signs(root, collection, protected_paths, obstacle_specs, roadside_specs):
    landmarks = [
        ("DISCOVERY_ROADSIDE_SHRINE", (-214, -103), "Roadside Hanuman shrine", 30, "shrine"),
        ("DISCOVERY_MANGO_ORCHARD", (96, -72), "Hariyali mango orchard", 25, "orchard"),
        ("DISCOVERY_FOREST_CHAI", (-244, 87), "Deodar forest chai stop", 35, "chai"),
        ("DISCOVERY_DEODAR_GATE", (-267, 29), "Old deodar forest gate", 30, "gate"),
        ("DISCOVERY_GORGE_BRIDGE_VIEW", (21, 112), "Forest gorge bridge view", 45, "view"),
        ("DISCOVERY_TUNNEL_LOOKOUT", (211, 113), "Pahadi tunnel lookout", 40, "view"),
        ("DISCOVERY_PRAYER_FLAG_BEND", (198, 101), "Prayer-flag bend", 30, "flags"),
        ("DISCOVERY_TERRACE_REST", (24, -69), "Terraced-field rest stop", 25, "rest"),
    ]
    landmark_radii = {"shrine": 2.2, "orchard": 7.0, "chai": 2.5, "gate": 3.0, "flags": 5.2, "view": 2.0, "rest": 2.0}
    for index, (name, desired, label, reward, kind) in enumerate(landmarks):
        landmark_radius = landmark_radii[kind]
        x, y, angle, _ = find_roadside_position(
            desired, landmark_radius, protected_paths, -1 if index % 2 else 1, obstacle_specs, roadside_specs
        )
        item = base.empty(name, (x, y, terrain_height(x, y)), root, collection)
        item.rotation_euler[2] = angle
        item["discovery_name"] = label
        item["reward"] = reward
        item["journey_discovery"] = True
        if kind == "shrine":
            base.box(item, f"Route_shrine_{index}", (0, 0, 1.5), (2.4, 2.0, 3.0), MATS["coral"], 0.15)
            base.ico(item, f"Route_shrine_roof_{index}", (0, 0, 3.2), 1, MATS["saffron"], 1, (1.8, 1.5, 0.75))
        elif kind == "chai":
            base.box(item, f"Route_chai_counter_{index}", (0, 0, 0.7), (3.2, 1.6, 1.4), MATS["teal"], 0.10)
            base.box(item, f"Route_chai_roof_{index}", (0, 0, 2.0), (4.0, 2.5, 0.25), MATS["yellow"], 0.08)
        elif kind == "gate":
            for side in (-1, 1):
                base.box(item, f"Forest_gate_post_{index}_{side}", (side * 2.2, 0, 1.8), (0.45, 0.45, 3.6), MATS["wood"], 0.08)
            base.box(item, f"Forest_gate_beam_{index}", (0, 0, 3.4), (5.2, 0.45, 0.45), MATS["wood"], 0.08)
        elif kind == "orchard":
            for row in range(2):
                for col in range(4):
                    ox, oy = (col - 1.5) * 3.0, (row - 0.5) * 3.2
                    base.cylinder(item, f"Orchard_trunk_{index}_{row}_{col}", (ox, oy, 1.0), 0.22, 2.0, MATS["wood"], 8)
                    base.ico(item, f"Orchard_tree_{index}_{row}_{col}", (ox, oy, 2.6), 1.2, MATS["grass_dark"], 1)
        elif kind == "flags":
            for flag_index in range(8):
                base.box(item, f"Prayer_flag_{index}_{flag_index}", ((flag_index - 3.5) * 1.2, 0, 2.4 + math.sin(flag_index) * 0.2), (0.8, 0.08, 0.55), MATS[("coral", "yellow", "teal", "blue")[flag_index % 4]], 0.04)
        else:
            base.box(item, f"Rest_bench_{index}", (0, 0, 0.75), (3.0, 0.65, 0.25), MATS["wood"], 0.08)
            for side in (-1, 1):
                base.box(item, f"Rest_leg_{index}_{side}", (side * 1.1, 0, 0.35), (0.22, 0.5, 0.7), MATS["wood"], 0.04)
        mark_roadside(item, landmark_radius, protected_paths, roadside_specs, "route_landmark")

    signs = [
        ((-222, -72), "नमस्ते बाज़ार · 1 किमी", "Namaste Bazaar · 1 km"),
        ((-112, -2), "झील मंदिर · 1 किमी", "Jheel Mandir · 1 km"),
        ((20, 4), "हरियाली गाँव · 1 किमी", "Hariyali Village · 1 km"),
        ((126, -11), "देवगढ़ किला · 1 किमी", "Devgarh Fort · 1 km"),
        ((206, 73), "पहाड़ी रेल · 1 किमी", "Pahadi Rail · 1 km"),
        ((-279, 63), "देवदार वन स्टेशन", "Deodar Forest Halt"),
        ((-91, 118), "झील पगडंडी", "Jheel walking trail"),
        ((143, 122), "किला पगडंडी", "Devgarh fort trail"),
    ]
    for index, (desired, hindi, english) in enumerate(signs):
        x, y, angle, _ = find_roadside_position(
            desired, 3.0, protected_paths, -1 if index % 2 else 1, obstacle_specs, roadside_specs
        )
        sign = base.empty(f"SIGN_DIRECTION_{index:02d}", (x, y, terrain_height(x, y)), root, collection)
        sign.rotation_euler[2] = angle
        sign["hindi"] = hindi
        sign["english"] = english
        sign["prompt"] = "Read the direction sign"
        sign["route_sign"] = True
        base.box(sign, f"Direction_board_{index}", (0, 0, 2.1), (5.2, 0.30, 1.7), MATS["teal_dark"], 0.08)
        base.text_mesh(sign, f"Direction_text_{index}", hindi, (0, -0.20, 2.34), 0.27, MATS["white"])
        english_size = min(0.23, 3.9 / max(10, len(english)))
        base.text_mesh(sign, f"Direction_text_en_{index}", english.upper(), (0, -0.20, 1.94), english_size, MATS["yellow"])
        base.box(sign, f"Direction_post_{index}", (0, 0, 0.95), (0.24, 0.24, 1.9), MATS["wood"], 0.04)
        mark_roadside(sign, 3.0, protected_paths, roadside_specs, "direction_sign")


def create_scenery(root, collection, protected_paths, obstacle_specs):
    all_points = [Vector(point) for path in protected_paths.values() for point in path]
    obstacle_centers = [(center, radius) for _, center, radius in obstacle_specs]
    created = 0
    attempts = 0
    while created < 210 and attempts < 4200:
        attempts += 1
        x = random.uniform(-288, 288)
        y = random.uniform(-140, 140)
        point = Vector((x, y))
        if min((point - route_point).length for route_point in all_points) < 7.4:
            continue
        if any((point - center).length < radius + 5.0 for center, radius in obstacle_centers):
            continue
        if ((x + 39) / 27) ** 2 + ((y - 31) / 19) ** 2 < 1.2:
            continue
        scale = random.uniform(0.85, 1.45)
        tree = base.empty(f"SCENERY_TREE_{created:03d}", (x, y, terrain_height(x, y)), root, collection)
        base.cylinder(tree, f"BATCH_TREE_TRUNK_{created:03d}", (0, 0, 1.35 * scale), 0.27 * scale, 2.7 * scale, MATS["wood"], 8)
        canopy = base.ico(tree, f"BATCH_TREE_CANOPY_{created:03d}", (0, 0, 3.2 * scale), 1.45 * scale, MATS[("grass", "grass_dark", "grass_light")[created % 3]], 1, (1.0, 0.9, 1.15))
        canopy["wind_phase"] = created * 0.37
        created += 1

    # Tonal ground facets carry most of the meadow, while these sparse flat
    # clusters add close-up texture. They deliberately avoid every protected
    # path and building footprint so grass never becomes a walking obstacle.
    meadow = base.empty("SCENERY_MEADOW_DETAILS", (0, 0, 0), root, collection)
    meadow_created = 0
    meadow_attempts = 0
    while meadow_created < 165 and meadow_attempts < 3600:
        meadow_attempts += 1
        x = random.uniform(-290, 290)
        y = random.uniform(-142, 142)
        point = Vector((x, y))
        if min((point - route_point).length for route_point in all_points) < 6.1:
            continue
        if any((point - center).length < radius + 3.8 for center, radius in obstacle_centers):
            continue
        if ((x + 39) / 29) ** 2 + ((y - 31) / 21) ** 2 < 1.15:
            continue
        size = random.uniform(0.65, 1.55)
        base.ico(
            meadow,
            f"BATCH_MEADOW_PATCH_{meadow_created:03d}",
            (x, y, terrain_height(x, y) + 0.055),
            1,
            MATS[("grass_dark", "grass_light")[meadow_created % 2]],
            1,
            (size * 1.45, size, 0.035),
        )
        if meadow_created % 7 == 0:
            flower = base.ico(
                meadow,
                f"BATCH_MEADOW_FLOWER_{meadow_created:03d}",
                (x + 0.35, y - 0.20, terrain_height(x, y) + 0.16),
                0.12,
                MATS[("yellow", "pink", "white")[meadow_created % 3]],
                1,
                (1.0, 1.0, 0.65),
            )
            flower["wind_phase"] = meadow_created * 0.21
        meadow_created += 1

    # Dense deodar bands frame the railway without entering its protected bed.
    rail_points = protected_paths.get("rail", [])
    forest = base.empty("SCENERY_DEODAR_RAIL_FOREST", (0, 0, 0), root, collection)
    forest_created = 0
    for rail_index in range(6, max(6, len(rail_points) - 4), 7):
        point = Vector(rail_points[rail_index])
        previous = Vector(rail_points[max(0, rail_index - 2)])
        following = Vector(rail_points[min(len(rail_points) - 1, rail_index + 2)])
        tangent = (following - previous).normalized()
        normal = Vector((-tangent.y, tangent.x))
        for side in (-1, 1):
            for depth_index, distance in enumerate((8.2, 12.4)):
                candidate = point + normal * side * distance + tangent * random.uniform(-2.8, 2.8)
                x, y = candidate.x, candidate.y
                if abs(x) > 294 or abs(y) > 146:
                    continue
                if any((candidate - center).length < radius + 4.0 for center, radius in obstacle_centers):
                    continue
                scale = random.uniform(0.9, 1.45)
                tree = base.empty(f"SCENERY_DEODAR_{forest_created:03d}", (x, y, terrain_height(x, y)), forest, collection)
                base.cylinder(tree, f"BATCH_DEODAR_TRUNK_{forest_created:03d}", (0, 0, 1.7 * scale), 0.24 * scale, 3.4 * scale, MATS["wood"], 8)
                base.ico(tree, f"BATCH_DEODAR_LOW_{forest_created:03d}", (0, 0, 3.0 * scale), 1, MATS["grass_dark"], 1, (1.55 * scale, 1.55 * scale, 2.2 * scale))
                base.ico(tree, f"BATCH_DEODAR_HIGH_{forest_created:03d}", (0, 0, 4.5 * scale), 1, MATS["grass"], 1, (1.05 * scale, 1.05 * scale, 1.8 * scale))
                forest_created += 1

    # Continue the land behind the playable edge so no sky-coloured trench is
    # visible between the railway lawn and the mountain wall.
    north_shelf_path = base.sample_path(
        [(-300, 166), (-225, 168), (-150, 165), (-75, 168), (0, 166), (75, 168), (150, 165), (225, 168), (300, 166)],
        12,
    )
    # Keep the decorative lawn entirely behind the railway. The former 43 m
    # ribbon reached y=138 and visibly buried the Devgarh sleepers.
    north_shelf = base.create_ribbon(root, "SCENERY_NORTH_FOREST_SHELF", north_shelf_path, 28.0, MATS["grass"], collection, -0.28, False)
    shelf_rail_clearance = min(
        (Vector(shelf_point) - Vector(rail_point)).length
        for shelf_point in north_shelf_path
        for rail_point in rail_points
    ) - 14.0 - PATH_HALF_WIDTHS["rail"]
    north_shelf["rail_edge_clearance_m"] = round(shelf_rail_clearance, 3)
    if shelf_rail_clearance < 6.0:
        raise RuntimeError(f"North lawn reaches the railway by {-shelf_rail_clearance:.2f} m")
    undergrowth = base.empty("SCENERY_NORTH_UNDERGROWTH", (0, 0, 0), root, collection)
    for index in range(90):
        x = random.uniform(-294, 294)
        y = random.uniform(148, 172)
        point = Vector((x, y))
        if rail_points and min((point - Vector(rail_point)).length for rail_point in rail_points) < 6.2:
            continue
        scale = random.uniform(0.45, 1.15)
        base.ico(
            undergrowth,
            f"BATCH_NORTH_UNDERGROWTH_{index:03d}",
            (x, y, terrain_height(x, y) + 0.45 * scale),
            0.72 * scale,
            MATS[("grass_dark", "grass", "grass_light")[index % 3]],
            1,
            (1.2, 1.0, 0.85),
        )

    hills = base.empty("BACKGROUND_HIMALAYAN_RANGE", (0, 0, 0), root, collection)
    for index in range(15):
        x = -300 + index * 43
        y = 158 + math.sin(index * 0.9) * 4
        height = 20 + (index % 5) * 5
        base.ico(hills, f"BACKGROUND_HILL_{index:02d}", (x, y, terrain_height(x, y) + height * 0.40), 1, MATS["earth_light"], 2, (25, 12, height))
        base.ico(hills, f"BACKGROUND_HILL_GREEN_{index:02d}", (x, y - 1, terrain_height(x, y) + height * 0.62), 1, MATS["grass_dark"], 2, (18, 9, height * 0.58))

    # Each edge has its own readable identity. Together they hide the hard map
    # cutoff from ordinary gameplay views without placing collision geometry on
    # the playable roads: Himalayas north, deodar forest west, ochre cliffs
    # east, and stepped farms/orchards south.
    west_wall = base.empty("BACKGROUND_WEST_DEODAR_WALL", (0, 0, 0), root, collection)
    west_index = 0
    for row, x in enumerate((-304.0, -313.0, -322.0)):
        for y in range(-148 + row * 4, 153, 12):
            scale = 1.25 + ((west_index * 7) % 9) * 0.075
            z = terrain_height(x, y)
            base.cylinder(west_wall, f"BATCH_WEST_TRUNK_{west_index:03d}", (x, y, z + 2.3 * scale), 0.34 * scale, 4.6 * scale, MATS["wood"], 7)
            base.ico(west_wall, f"BATCH_WEST_DEODAR_LOW_{west_index:03d}", (x, y, z + 4.5 * scale), 1, MATS["grass_dark"], 1, (2.4 * scale, 2.0 * scale, 3.8 * scale))
            base.ico(west_wall, f"BATCH_WEST_DEODAR_HIGH_{west_index:03d}", (x, y, z + 7.2 * scale), 1, MATS["grass"], 1, (1.55 * scale, 1.4 * scale, 3.0 * scale))
            west_index += 1

    east_wall = base.empty("BACKGROUND_EAST_SANDSTONE_CLIFFS", (0, 0, 0), root, collection)
    east_index = 0
    for row, x in enumerate((305.0, 316.0)):
        for y in range(-150 + row * 7, 156, 19):
            height = 14.0 + ((east_index * 5) % 8) * 1.45
            z = terrain_height(x, y)
            base.ico(
                east_wall,
                f"BATCH_EAST_CLIFF_{east_index:03d}",
                (x, y, z + height * 0.34),
                1,
                MATS[("earth", "earth_light", "stone")[east_index % 3]],
                2,
                (8.8 + row * 2.0, 11.5, height),
            )
            if east_index % 2 == 0:
                base.ico(
                    east_wall,
                    f"BATCH_EAST_CLIFF_GREEN_{east_index:03d}",
                    (x - 2.0, y - 1.0, z + height * 0.70),
                    1,
                    MATS["grass_dark"],
                    1,
                    (5.8, 7.2, 2.0),
                )
            east_index += 1

    south_edge = base.empty("BACKGROUND_SOUTH_TERRACED_ORCHARDS", (0, 0, 0), root, collection)
    for terrace_index, x in enumerate(range(-292, 293, 28)):
        width = 29.0
        edge_height = terrain_height(x, -150.0)
        base.box(
            south_edge,
            f"BATCH_SOUTH_RETAINING_TERRACE_{terrace_index:02d}",
            (x, -153.5, edge_height - 2.7),
            (width, 11.0, 6.0),
            MATS[("earth_light", "stone", "earth")[terrace_index % 3]],
            0.16,
        )
        base.box(
            south_edge,
            f"BATCH_SOUTH_PLANTED_TOP_{terrace_index:02d}",
            (x, -152.0, edge_height + 0.36),
            (width, 8.5, 0.55),
            MATS[("grass", "grass_light")[terrace_index % 2]],
            0.12,
        )
        if terrace_index % 2 == 0:
            base.cylinder(south_edge, f"BATCH_SOUTH_ORCHARD_TRUNK_{terrace_index:02d}", (x, -151.0, edge_height + 2.0), 0.34, 4.0, MATS["wood"], 8)
            base.ico(south_edge, f"BATCH_SOUTH_ORCHARD_TOP_{terrace_index:02d}", (x, -151.0, edge_height + 4.8), 1, MATS[("grass", "grass_dark")[terrace_index % 2]], 1, (2.8, 2.5, 3.0))

    fields = base.empty("SCENERY_TERRACED_FIELDS", (0, 0, 0), root, collection)
    for field_index, (x, y, width) in enumerate(((-220, -18, 28), (-205, 10, 34), (-105, 55, 30), (35, -55, 40), (95, -65, 35), (140, -40, 32), (205, 20, 25))):
        for strip in range(5):
            base.box(fields, f"BATCH_FIELD_{field_index}_{strip}", (x, y + strip * 2.0, terrain_height(x, y + strip * 2.0) + 0.12), (width - strip * 1.4, 1.35, 0.22), MATS[("grass_light", "earth_light")[strip % 2]], 0.04)


def create_character(root, collection):
    player = base.create_character(root, collection)
    x, y = -272.0, -103.0
    player.location = (x, y, terrain_height(x, y) + 0.08)
    player["spawn_heading_x"] = 0.88
    player["spawn_heading_z"] = -0.47
    return player


def validate_layout(protected_paths, obstacle_specs, roadside_specs):
    checks = []
    blocked = []
    all_points = [Vector(point) for path in protected_paths.values() for point in path]
    for name, center, radius in obstacle_specs:
        clearance = min((center - point).length for point in all_points) - radius
        checks.append({"name": name, "edge_clearance": round(clearance, 3)})
        if clearance < 2.35:
            blocked.append(name)
    rail_points = [Vector(point) for point in protected_paths.get("rail", [])]
    road_points = [
        Vector(point)
        for key in ("main", "bazaar", "lake", "village", "fort", "mountain", "south")
        for point in protected_paths.get(key, [])
    ]
    allowed_crossings = (Vector((-288, -105)), Vector((257, 115)))
    separated_rail = [point for point in rail_points if min((point - crossing).length for crossing in allowed_crossings) > 25.0]
    rail_road_clearance = min((rail_point - road_point).length for rail_point in separated_rail for road_point in road_points)
    if rail_road_clearance < 8.0:
        blocked.append("RAIL_ROAD_CORRIDOR_SEPARATION")
    roadside_checks = []
    roadside_obstacle_clearances = []
    for name, center, radius, authored_clearance, category in roadside_specs:
        clearance = roadside_edge_clearance(center, radius, protected_paths)
        obstacle_clearance = min(
            (center - other_center).length - radius - other_radius
            for _, other_center, other_radius in obstacle_specs
        )
        roadside_obstacle_clearances.append(obstacle_clearance)
        roadside_checks.append({
            "name": name,
            "category": category,
            "road_edge_clearance": round(clearance, 3),
            "building_edge_clearance": round(obstacle_clearance, 3),
        })
        if clearance < ROADSIDE_CLEARANCE - 0.01:
            blocked.append(name)
        if obstacle_clearance < 1.39:
            blocked.append(name + "_BUILDING_OVERLAP")
    roadside_pair_clearance = min(
        (left_center - right_center).length - left_radius - right_radius
        for left_index, (_, left_center, left_radius, _, _) in enumerate(roadside_specs)
        for _, right_center, right_radius, _, _ in roadside_specs[left_index + 1:]
    )
    if roadside_pair_clearance < 0.89:
        blocked.append("ROADSIDE_PROP_OVERLAP")
    north_shelf = bpy.data.objects.get("SCENERY_NORTH_FOREST_SHELF")
    north_shelf_rail_clearance = float(north_shelf.get("rail_edge_clearance_m", -1.0)) if north_shelf else -1.0
    if north_shelf_rail_clearance < 6.0:
        blocked.append("DEVGARH_RAIL_LAWN_OVERLAP")
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
        "map_dimensions_m": [600, 300],
        "map_area_m2": 180000,
        "playable_ground_mode": "level",
        "playable_ground_z_m": PLAYABLE_GROUND_Z,
        "playable_elevation_span_m": round(playable_elevation_span, 6),
        "protected_path_samples": sum(len(path) for path in protected_paths.values()),
        "protected_routes": list(protected_paths.keys()),
        "obstacle_count": len(obstacle_specs),
        "district_count": len(DISTRICTS),
        "walkable_count": 15,
        "interaction_count": 12,
        "npc_count": 10,
        "animal_count": 6,
        "scooter_count": 6,
        "train_stop_count": 5,
        "rail_road_clearance_m": round(rail_road_clearance, 3),
        "north_shelf_rail_clearance_m": round(north_shelf_rail_clearance, 3),
        "roadside_prop_count": len(roadside_specs),
        "minimum_roadside_clearance_m": round(min(item[3] for item in roadside_specs), 3),
        "minimum_roadside_building_clearance_m": round(min(roadside_obstacle_clearances), 3),
        "minimum_roadside_pair_clearance_m": round(roadside_pair_clearance, 3),
        "postcard_count": 8,
        "discovery_count": 14,
        "districts": [item["name"] for item in DISTRICTS],
        "building_checks": checks,
        "roadside_checks": roadside_checks,
    }
    with open(REPORT_PATH, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2, ensure_ascii=False)
    print("NIMBU_GRAND_LAYOUT", json.dumps(report, ensure_ascii=False))
    if blocked:
        raise RuntimeError("Protected corridors blocked by: " + ", ".join(blocked))
    return report


def configure_render(collection):
    base.configure_render()
    scene = bpy.context.scene
    scene.render.resolution_x = 1440
    scene.render.resolution_y = 900
    base.create_lighting(collection)


def build():
    base.clear_scene()
    export = base.make_collection("EXPORT_NIMBU_GRAND_WORLD")
    root = base.empty("WORLD_NIMBU_GRAND", collection=export)
    root["world_style"] = "bruno_inspired_indian_open_world"
    root["gravity_mode"] = "flat"
    root["playable_ground_mode"] = "level"
    root["playable_ground_z_m"] = PLAYABLE_GROUND_Z
    root["map_width_m"] = 600
    root["map_depth_m"] = 300
    root["district_count"] = 6

    create_terrain(root, export)
    protected_paths, _ = create_road_network(root, export)
    create_lake(root, export)
    train_path, station_links = create_train(root, export)
    protected_paths["rail"] = train_path
    protected_paths.update(station_links)
    obstacle_specs = []
    roadside_specs = []
    for district in DISTRICTS:
        create_district(root, export, district, obstacle_specs, protected_paths, roadside_specs)
    create_named_interactions(root, export, protected_paths, obstacle_specs, roadside_specs)
    create_scooter_and_traffic(root, export, protected_paths, obstacle_specs, roadside_specs)
    create_people_and_animals(root, export, protected_paths, obstacle_specs, roadside_specs)
    create_discoveries_collectibles_and_festival(root, export, protected_paths, obstacle_specs, roadside_specs)
    create_route_landmarks_and_signs(root, export, protected_paths, obstacle_specs, roadside_specs)
    create_scenery(root, export, protected_paths, obstacle_specs)
    create_character(root, export)
    report = validate_layout(protected_paths, obstacle_specs, roadside_specs)

    configure_render(export)
    gameplay_camera = base.create_camera("CAMERA_GRAND_GAMEPLAY", (-292, -128, 18), (-245, -75, 2), 52)
    overview_camera = base.create_camera("CAMERA_GRAND_OVERVIEW", (-430, -480, 420), (0, 0, 5), 58)
    lake_camera = base.create_camera("CAMERA_GRAND_LAKE", (-105, -28, 68), (-38, 30, 2), 54)
    mountain_camera = base.create_camera("CAMERA_GRAND_MOUNTAIN", (150, 5, 78), (246, 105, 8), 54)
    scene = bpy.context.scene
    if os.environ.get("NIMBU_SKIP_RENDERS") != "1":
        for camera, filename in (
            (gameplay_camera, "nimbu_grand_gameplay.png"),
            (overview_camera, "nimbu_grand_overview.png"),
            (lake_camera, "nimbu_grand_lake.png"),
            (mountain_camera, "nimbu_grand_mountain.png"),
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
    print("NIMBU_GRAND_COMPLETE", BLEND_PATH, GLB_PATH, json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    build()
