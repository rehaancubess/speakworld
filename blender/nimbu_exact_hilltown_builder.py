import bpy
import json
import math
import os
import random
from mathutils import Vector


ROOT = "/Users/rehaanr/Documents/openai"
REFERENCE_PATH = "/Users/rehaanr/Downloads/Generated image 1 (2).png"
BLEND_PATH = os.path.join(ROOT, "blender", "nimbu_exact_hilltown_master.blend")
RENDER_PATH = os.path.join(ROOT, "blender", "output", "nimbu_exact_hilltown.png")
OVERVIEW_RENDER_PATH = os.path.join(ROOT, "blender", "output", "nimbu_exploration_overview.png")
GLB_PATH = os.path.join(ROOT, "public", "assets", "nimbu_exact_hilltown.glb")
LAYOUT_REPORT_PATH = os.path.join(ROOT, "blender", "output", "nimbu_layout_report.json")

random.seed(37)
os.makedirs(os.path.dirname(RENDER_PATH), exist_ok=True)
os.makedirs(os.path.dirname(GLB_PATH), exist_ok=True)


PALETTE = {
    "sky": (0.16, 0.69, 0.72, 1),
    "cloud": (0.68, 0.91, 0.84, 1),
    "mountain": (0.40, 0.64, 0.67, 1),
    "mountain_far": (0.54, 0.75, 0.75, 1),
    "snow": (0.76, 0.88, 0.84, 1),
    "grass": (0.13, 0.45, 0.22, 1),
    "grass_light": (0.27, 0.57, 0.27, 1),
    "grass_dark": (0.08, 0.34, 0.18, 1),
    "stone": (0.59, 0.52, 0.41, 1),
    "stone_light": (0.69, 0.62, 0.49, 1),
    "stone_mid": (0.51, 0.47, 0.39, 1),
    "stone_dark": (0.40, 0.43, 0.39, 1),
    "road": (0.20, 0.27, 0.27, 1),
    "road_edge": (0.78, 0.73, 0.60, 1),
    "plaster": (0.84, 0.82, 0.72, 1),
    "plaster_shadow": (0.64, 0.65, 0.58, 1),
    "teal": (0.05, 0.43, 0.45, 1),
    "teal_dark": (0.03, 0.25, 0.27, 1),
    "water": (0.21, 0.80, 0.80, 1),
    "water_light": (0.61, 0.95, 0.91, 1),
    "water_dark": (0.04, 0.41, 0.47, 1),
    "wood": (0.49, 0.30, 0.16, 1),
    "yellow": (0.91, 0.57, 0.10, 1),
    "orange": (0.91, 0.31, 0.08, 1),
    "red": (0.67, 0.15, 0.09, 1),
    "pink": (0.82, 0.28, 0.43, 1),
    "ink": (0.018, 0.028, 0.03, 1),
    "skin": (0.58, 0.34, 0.25, 1),
    "hair": (0.08, 0.08, 0.11, 1),
    "shirt": (0.02, 0.55, 0.60, 1),
    "pants": (0.03, 0.20, 0.28, 1),
    "eye_white": (0.96, 0.95, 0.88, 1),
    "eye_brown": (0.12, 0.06, 0.03, 1),
}


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.cameras, bpy.data.lights):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def material(name, color):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = 0.92
    return mat


def make_collection(name):
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    return collection


def move_to_collection(obj, target):
    for current in list(obj.users_collection):
        current.objects.unlink(obj)
    target.objects.link(obj)


def root(name, target, location=(0, 0, 0), rotation=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    target.objects.link(obj)
    obj.location = location
    obj.rotation_euler = rotation
    return obj


def box(parent, name, location, dimensions, mat, rotation=(0, 0, 0), bevel=0.04):
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.parent = parent
    move_to_collection(obj, parent.users_collection[0])
    obj.location = location
    obj.rotation_euler = rotation
    obj.data.materials.append(mat)
    if bevel:
        modifier = obj.modifiers.new("Illustrated edge", "BEVEL")
        modifier.width = bevel
        modifier.segments = 1
    obj.select_set(False)
    return obj


def irregular_prism(parent, name, location, width, depth, height, mat, rotation=0.0):
    """Low-poly hand-cut paving stone with a unique non-rectangular outline."""
    outline = [
        (-0.48, -0.36), (-0.18, -0.51), (0.35, -0.46), (0.51, -0.10),
        (0.43, 0.39), (0.04, 0.50), (-0.39, 0.42), (-0.52, 0.04),
    ]
    ca, sa = math.cos(rotation), math.sin(rotation)
    lower, upper = [], []
    for px, py in outline:
        x, y = px * width, py * depth
        lower.append((x * ca - y * sa, x * sa + y * ca, -height * 0.5))
        upper.append((x * ca - y * sa, x * sa + y * ca, height * 0.5))
    vertices = lower + upper
    count = len(outline)
    faces = [tuple(range(count - 1, -1, -1)), tuple(range(count, count * 2))]
    for index in range(count):
        following = (index + 1) % count
        faces.append((index, following, count + following, count + index))
    obj = mesh_object(name, vertices, faces, mat, parent.users_collection[0])
    obj.parent = parent
    obj.location = location
    return obj


def cylinder(parent, name, location, radius, depth, mat, rotation=(0, 0, 0), vertices=10):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth)
    obj = bpy.context.object
    obj.name = name
    obj.parent = parent
    move_to_collection(obj, parent.users_collection[0])
    obj.location = location
    obj.rotation_euler = rotation
    obj.data.materials.append(mat)
    obj.select_set(False)
    return obj


def cone(parent, name, location, radius, depth, mat, rotation=(0, 0, 0), vertices=8):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius, radius2=0, depth=depth)
    obj = bpy.context.object
    obj.name = name
    obj.parent = parent
    move_to_collection(obj, parent.users_collection[0])
    obj.location = location
    obj.rotation_euler = rotation
    obj.data.materials.append(mat)
    obj.select_set(False)
    return obj


def sphere(parent, name, location, scale, mat, subdivisions=2, smooth=False):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1)
    obj = bpy.context.object
    obj.name = name
    obj.parent = parent
    move_to_collection(obj, parent.users_collection[0])
    obj.location = location
    obj.scale = scale
    obj.data.materials.append(mat)
    if smooth:
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
    obj.select_set(False)
    return obj


def mesh_object(name, vertices, faces, mat, target):
    mesh = bpy.data.meshes.new(name + "_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    target.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def curve_object(name, points, mat, target, bevel=0.035, cyclic=False):
    curve = bpy.data.curves.new(name + "_curve", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 1
    curve.bevel_depth = bevel
    curve.bevel_resolution = 0
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, coordinates in zip(spline.points, points):
        point.co = (*coordinates, 1)
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, curve)
    target.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def point_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def join_mesh_batch(objects, joined_name):
    """Collapse disconnected static details into one multi-material web mesh."""
    meshes = [obj for obj in objects if obj and obj.type == "MESH"]
    if len(meshes) < 2:
        if meshes:
            meshes[0].name = joined_name
        return meshes[0] if meshes else None
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    meshes[0].name = joined_name
    meshes[0].select_set(False)
    return meshes[0]


def optimize_web_scene(target):
    """Keep the illustrated detail while avoiding thousands of WebGL draws."""
    tree_prefixes = ("Village_tree_", "Ridge_tree_", "Waterfall_pine_", "Upper_valley_tree_", "Island_tree_")
    tree_parents = [
        parent for parent in list(target.objects)
        if parent.type == "EMPTY" and parent.name.startswith(tree_prefixes)
    ]
    detail_parent_names = [
        parent.name for parent in list(target.objects)
        if parent.type == "EMPTY" and parent.name.startswith(("Bazaar_building_", "Lake_building_", "Rail_building_", "Hamlet_building_", "Terrace_field_"))
    ]
    batches = (
        ("Exact_ground", "Cobble_", "Cobblestone_field"),
        ("Railway_trail_details", "Trail_stone_", "Railway_trail_stones"),
        ("UPPER_VALLEY_SQUARE", "Upper_square_stone_", "Upper_square_stones"),
    )
    for parent_name, prefix, joined_name in batches:
        parent = bpy.data.objects.get(parent_name)
        if parent:
            join_mesh_batch([child for child in parent.children if child.name.startswith(prefix)], joined_name)

    roads = bpy.data.objects.get("INDIA_VEHICLE_ROAD_NETWORK")
    if roads:
        join_mesh_batch(
            [child for child in roads.children if "_dash_" in child.name or child.name.startswith("Pedestrian_crossing_")],
            "Road_markings",
        )

    # Each low-poly tree remains individually collidable, but its trunk and
    # foliage become one multi-material mesh instead of four to six draw calls.
    for parent in tree_parents:
        join_mesh_batch(list(parent.children), parent.name + "_mesh")

    for parent_name in detail_parent_names:
        parent = bpy.data.objects.get(parent_name)
        if parent:
            join_mesh_batch(list(parent.children), parent.name + "_mesh")

    for parent_name, joined_name in (
        ("ISLAND_PERIMETER_CLIFFS", "Island_perimeter_cliffs"),
        ("HIMALAYAN_BLOSSOM_TREES", "Himalayan_blossom_trees"),
        ("ISLAND_CLOUD_RING", "Island_cloud_ring"),
        ("PRAYER_FLAG_NETWORK", "Prayer_flag_network"),
    ):
        parent = bpy.data.objects.get(parent_name)
        if parent:
            join_mesh_batch(list(parent.children), joined_name)


def create_ribbon(name, points, widths, z, mat, target):
    vertices = []
    faces = []
    for index, (x, y) in enumerate(points):
        previous = Vector(points[max(0, index - 1)])
        following = Vector(points[min(len(points) - 1, index + 1)])
        tangent = (following - previous).normalized()
        side = Vector((-tangent.y, tangent.x))
        width = widths[index] if isinstance(widths, (list, tuple)) else widths
        vertices.extend(((x + side.x * width * 0.5, y + side.y * width * 0.5, z), (x - side.x * width * 0.5, y - side.y * width * 0.5, z)))
        if index:
            a = (index - 1) * 2
            b = index * 2
            faces.extend(((a, b, a + 1), (a + 1, b, b + 1)))
    return mesh_object(name, vertices, faces, mat, target)


def create_ribbon_3d(name, points, widths, mat, target):
    """Road/path ribbon whose control points carry their real terrain height."""
    vertices = []
    faces = []
    for index, (x, y, z) in enumerate(points):
        previous = Vector(points[max(0, index - 1)][:2])
        following = Vector(points[min(len(points) - 1, index + 1)][:2])
        tangent = (following - previous).normalized()
        side = Vector((-tangent.y, tangent.x))
        width = widths[index] if isinstance(widths, (list, tuple)) else widths
        vertices.extend((
            (x + side.x * width * 0.5, y + side.y * width * 0.5, z),
            (x - side.x * width * 0.5, y - side.y * width * 0.5, z),
        ))
        if index:
            a = (index - 1) * 2
            b = index * 2
            faces.extend(((a, b, a + 1), (a + 1, b, b + 1)))
    return mesh_object(name, vertices, faces, mat, target)


def create_plateau(name, outline, top_z, bottom_z, top_mat, side_mat, target):
    """Create a web-light walkable top plus a faceted cliff wall."""
    center_x = sum(point[0] for point in outline) / len(outline)
    center_y = sum(point[1] for point in outline) / len(outline)
    top_vertices = [(center_x, center_y, top_z)] + [(x, y, top_z) for x, y in outline]
    top_faces = []
    for index in range(len(outline)):
        top_faces.append((0, index + 1, (index + 1) % len(outline) + 1))
    top = mesh_object(name, top_vertices, top_faces, top_mat, target)

    side_vertices = []
    side_faces = []
    for index, (x, y) in enumerate(outline):
        next_x, next_y = outline[(index + 1) % len(outline)]
        base = len(side_vertices)
        side_vertices.extend(((x, y, top_z), (next_x, next_y, top_z), (next_x, next_y, bottom_z), (x, y, bottom_z)))
        side_faces.append((base, base + 1, base + 2, base + 3))
    mesh_object(name + "_cliff", side_vertices, side_faces, side_mat, target)
    return top


MAIN_PATH_3D = [
    (-6.0, -28.0, 0.12), (-10.0, -17.0, 0.12), (-2.0, -5.0, 0.12), (7.0, 8.0, 0.12),
    (4.0, 22.0, 0.40), (-4.0, 35.0, 1.10), (-15.0, 46.0, 2.10), (-31.0, 58.0, 2.12),
    (-32.0, 72.0, 2.12), (-31.0, 86.0, 2.12), (-27.0, 100.0, 2.40), (-20.0, 115.0, 3.25),
    (-13.0, 128.0, 5.10), (2.0, 140.0, 7.12), (5.0, 153.0, 7.12), (0.0, 174.0, 7.12),
]
MAIN_PATH_POINTS = [(x, y) for x, y, _ in MAIN_PATH_3D]

VEHICLE_ROAD_LOOP_3D = [
    (0.0, -27.0, 0.16), (30.0, -22.0, 0.16), (48.0, -5.0, 0.22), (57.0, 22.0, 0.82),
    (60.0, 50.0, 1.82), (62.0, 78.0, 2.18), (60.0, 104.0, 3.05), (58.0, 130.0, 5.05),
    (50.0, 154.0, 7.16), (32.0, 173.0, 7.16), (5.0, 179.0, 7.16), (-22.0, 173.0, 7.16),
    (-43.0, 158.0, 6.55), (-55.0, 138.0, 5.20), (-61.0, 110.0, 2.55), (-62.0, 82.0, 2.18),
    (-61.0, 52.0, 1.78), (-57.0, 25.0, 0.82), (-48.0, 3.0, 0.22), (-28.0, -18.0, 0.16),
]
VEHICLE_ROAD_LOOP_POINTS = [(x, y) for x, y, _ in VEHICLE_ROAD_LOOP_3D]

CITY_ROAD_BRANCHES_3D = (
    ("LOWER_CITY_ROAD", [(-50.0, 5.0, 0.16), (-30.0, 2.0, 0.16), (-10.0, 0.0, 0.16), (12.0, 2.0, 0.16), (32.0, 4.0, 0.16), (50.0, 8.0, 0.24)]),
    ("MIDDLE_CITY_ROAD", [(-58.0, 58.0, 2.14), (-38.0, 55.0, 2.14), (-20.0, 53.0, 2.14), (2.0, 50.0, 2.14), (24.0, 52.0, 2.14), (43.0, 58.0, 2.14), (59.0, 65.0, 2.16)]),
    ("UPPER_CITY_ROAD", [(-47.0, 144.0, 7.14), (-25.0, 147.0, 7.14), (0.0, 148.0, 7.14), (24.0, 146.0, 7.14), (49.0, 140.0, 7.14)]),
)
CITY_ROAD_BRANCHES = tuple((name, [(x, y) for x, y, _ in points]) for name, points in CITY_ROAD_BRANCHES_3D)


def path_center(y):
    for index in range(len(MAIN_PATH_POINTS) - 1):
        a = MAIN_PATH_POINTS[index]
        b = MAIN_PATH_POINTS[index + 1]
        if a[1] <= y <= b[1]:
            t = (y - a[1]) / (b[1] - a[1])
            return a[0] + (b[0] - a[0]) * t
    return MAIN_PATH_POINTS[0][0] if y < MAIN_PATH_POINTS[0][1] else MAIN_PATH_POINTS[-1][0]


def path_width(y):
    return 7.6 if y < 30 else 5.2


def path_height(y):
    for index in range(len(MAIN_PATH_3D) - 1):
        a = MAIN_PATH_3D[index]
        b = MAIN_PATH_3D[index + 1]
        if a[1] <= y <= b[1]:
            t = (y - a[1]) / (b[1] - a[1])
            return a[2] + (b[2] - a[2]) * t
    return MAIN_PATH_3D[0][2] if y < MAIN_PATH_3D[0][1] else MAIN_PATH_3D[-1][2]


def distance_to_route(x, y, points, cyclic=False):
    point = Vector((x, y))
    segments = list(zip(points, points[1:]))
    if cyclic:
        segments.append((points[-1], points[0]))
    best = float("inf")
    for a_values, b_values in segments:
        a = Vector(a_values[:2])
        b = Vector(b_values[:2])
        delta = b - a
        amount = 0.0 if delta.length_squared == 0 else max(0.0, min(1.0, (point - a).dot(delta) / delta.length_squared))
        best = min(best, (point - a.lerp(b, amount)).length)
    return best


def clears_protected_routes(x, y, radius=1.7):
    if distance_to_route(x, y, MAIN_PATH_3D) < path_width(y) * 0.5 + radius:
        return False
    if distance_to_route(x, y, VEHICLE_ROAD_LOOP_3D, cyclic=True) < 3.8 + radius:
        return False
    for _, route in CITY_ROAD_BRANCHES_3D:
        if distance_to_route(x, y, route) < 3.6 + radius:
            return False
    return True


def create_lane_dashes(name, points, parent, mats, cyclic=False):
    segments = list(zip(points, points[1:]))
    if cyclic:
        segments.append((points[-1], points[0]))
    dash_index = 0
    for start, end in segments:
        a, b = Vector(start), Vector(end)
        delta = b - a
        distance = delta.length
        count = max(1, int(distance / 5.2))
        angle = math.atan2(delta.y, delta.x) - math.pi / 2
        for index in range(count):
            t = (index + 0.5) / count
            position = a.lerp(b, t)
            box(parent, f"{name}_dash_{dash_index:03d}", (position.x, position.y, 0.16), (0.13, 2.0, 0.055), mats["road_edge"], rotation=(0, 0, angle), bevel=0.018)
            dash_index += 1


def create_road_network(target, mats):
    roads = root("INDIA_VEHICLE_ROAD_NETWORK", target)
    loop = VEHICLE_ROAD_LOOP_POINTS + [VEHICLE_ROAD_LOOP_POINTS[0]]
    shoulder = create_ribbon("VEHICLE_ROAD_SHOULDER", loop, [9.8] * len(loop), 0.026, mats["stone_mid"], target)
    shoulder.parent = roads
    road = create_ribbon("VEHICLE_ROAD_LOOP", loop, [7.4] * len(loop), 0.085, mats["road"], target)
    road.parent = roads
    create_lane_dashes("Loop_lane", VEHICLE_ROAD_LOOP_POINTS, roads, mats, cyclic=True)

    for road_name, points in CITY_ROAD_BRANCHES:
        branch_shoulder = create_ribbon(road_name + "_SHOULDER", points, [9.2] * len(points), 0.030, mats["stone_mid"], target)
        branch_shoulder.parent = roads
        branch = create_ribbon(road_name, points, [7.0] * len(points), 0.090, mats["road"], target)
        branch.parent = roads
        create_lane_dashes(road_name, points, roads, mats)

    for crossing_index, y in enumerate((2.0, 78.0, 140.0)):
        center_x = path_center(y)
        for stripe in range(-3, 4):
            box(
                roads,
                f"Pedestrian_crossing_{crossing_index}_{stripe}",
                (center_x + stripe * 0.72, y, 0.17),
                (0.42, 5.8, 0.055),
                mats["plaster"],
                bevel=0.025,
            )

    route = root("ROAD_ROUTE_WAYPOINTS", target)
    for index, point in enumerate(VEHICLE_ROAD_LOOP_POINTS):
        marker = root(f"ROAD_ROUTE_{index:02d}", target, (point[0], point[1], 0.10))
        marker.parent = route
    return roads


def create_city_gate(name, center, width, target, mats, accent="yellow"):
    gate = root(name, target)
    x, y = center
    for side in (-1, 1):
        box(gate, f"{name}_pillar_{side}", (x + side * width * 0.5, y, 1.75), (0.52, 0.62, 3.5), mats["plaster"], bevel=0.06)
        box(gate, f"{name}_finial_base_{side}", (x + side * width * 0.5, y, 3.62), (0.78, 0.80, 0.26), mats["stone_light"], bevel=0.05)
        cone(gate, f"{name}_finial_{side}", (x + side * width * 0.5, y, 4.15), 0.24, 0.82, mats[accent], vertices=7)
    box(gate, f"{name}_sign", (x, y, 3.48), (width, 0.28, 0.86), mats[accent], bevel=0.08)
    return gate


def create_market_stall(name, x, y, target, mats, accent="orange", rotation=0.0):
    stall = root(name, target, (x, y, 0.08), rotation=(0, 0, rotation))
    box(stall, name + "_counter", (0, -0.55, 0.82), (2.7, 0.70, 0.42), mats["wood"], bevel=0.05)
    for side in (-1, 1):
        box(stall, f"{name}_post_{side}", (side * 1.18, 0, 1.55), (0.13, 0.13, 2.8), mats["wood"], bevel=0.02)
    box(stall, name + "_awning", (0, 0, 2.82), (3.1, 2.05, 0.24), mats[accent], rotation=(0.08, 0, 0), bevel=0.06)
    for index in range(7):
        sphere(stall, f"{name}_produce_{index}", (-0.90 + index * 0.30, -0.86, 1.14 + (index % 2) * 0.05), (0.14, 0.12, 0.13), mats["yellow" if index % 2 else "orange"], 1)
    return stall


def create_three_city_identity(target, mats):
    # City 1: a lively lower bazaar and arrival neighbourhood.
    lower = root("CITY_1_NAMASTE_BAZAAR", target)
    create_city_gate("Namaste_Bazaar_gate", (path_center(13.0), 13.0), 10.5, target, mats, "yellow").parent = lower
    create_market_stall("Bazaar_fruit_stall", -29.0, -12.0, target, mats, "orange", -0.04).parent = lower
    create_market_stall("Bazaar_spice_stall", 10.5, 18.0, target, mats, "yellow", math.pi).parent = lower
    box(lower, "Bazaar_notice_board", (-11.0, 8.5, 1.35), (2.2, 0.20, 1.55), mats["teal_dark"], bevel=0.07)

    # City 2: a quieter lake, temple, and craft quarter.
    middle = root("CITY_2_JHEEL_MANDIR", target)
    create_city_gate("Jheel_Mandir_gate", (path_center(66.0), 66.0), 7.6, target, mats, "orange").parent = middle
    create_market_stall("Mandir_flower_stall", 8.5, 71.0, target, mats, "orange", math.pi).parent = middle
    box(middle, "Jheel_city_map", (9.5, 85.5, 1.45), (2.5, 0.22, 1.75), mats["teal"], bevel=0.08)
    for index, x in enumerate((-15.0, -12.0, -9.0)):
        box(middle, f"Craft_shop_{index}", (x, 88.0, 1.65), (2.25, 3.2, 3.3), mats["plaster"], bevel=0.08)
        box(middle, f"Craft_shop_awning_{index}", (x, 86.32, 2.05), (2.45, 0.72, 0.18), mats["teal" if index % 2 else "yellow"], rotation=(0.08, 0, 0), bevel=0.04)

    # City 3: the upper railway settlement and travellers' square.
    upper = root("CITY_3_PAHADI_RAIL", target)
    create_city_gate("Pahadi_Rail_gate", (path_center(131.0), 131.0), 7.8, target, mats, "yellow").parent = upper
    create_market_stall("Rail_city_snack_stall", -8.5, 151.0, target, mats, "orange", 0.06).parent = upper
    box(upper, "Rail_city_timetable", (12.0, 146.5, 1.50), (2.8, 0.22, 1.85), mats["yellow"], bevel=0.08)
    for index, x in enumerate((-5.0, 0.0, 11.5)):
        cylinder(upper, f"Rail_city_lamp_{index}", (x, 156.0, 1.45), 0.10, 2.9, mats["ink"], vertices=10)
        sphere(upper, f"Rail_city_lamp_globe_{index}", (x, 156.0, 3.02), (0.24, 0.24, 0.30), mats["yellow"], 2)


def create_sky_and_mountains(target, mats):
    sky = root("Exact_sky", target, (0, 228, 28.0))
    box(sky, "Sky_card", (0, 0.8, 0), (280, 0.18, 105), mats["sky"], bevel=0)

    def mountain(name, cx, y, base_z, width, height, mat):
        points = [
            (cx - width * 0.56, y, base_z),
            (cx - width * 0.34, y, base_z + height * 0.42),
            (cx - width * 0.12, y, base_z + height * 0.72),
            (cx, y, base_z + height),
            (cx + width * 0.15, y, base_z + height * 0.66),
            (cx + width * 0.34, y, base_z + height * 0.48),
            (cx + width * 0.56, y, base_z),
        ]
        faces = [(0, 1, 6), (1, 5, 6), (1, 2, 5), (2, 4, 5), (2, 3, 4)]
        return mesh_object(name, points, faces, mat, target)

    mountain("Far_mountain_left", -72, 227.5, 0.0, 78, 34.0, mats["mountain_far"])
    mountain("Far_mountain_center", 0, 227.4, 0.0, 90, 43.0, mats["mountain"])
    mountain("Far_mountain_right", 76, 227.3, 0.0, 84, 38.0, mats["mountain_far"])
    mountain("Snow_peak_left", -72, 227.05, 26.0, 17.0, 11.0, mats["snow"])
    mountain("Snow_peak_center", 0, 227.05, 33.0, 20.0, 13.0, mats["snow"])
    mountain("Snow_peak_right", 76, 226.95, 29.0, 18.0, 11.5, mats["snow"])

    for index, (x, z, sx, sz, rot) in enumerate((
        (-62, 31.0, 9.0, 1.80, 0.08), (-24, 34.0, 8.8, 1.75, -0.04),
        (26, 32.0, 9.0, 1.80, 0.08), (68, 35.0, 6.8, 1.30, -0.08),
    )):
        cloud = sphere(sky, f"Painted_cloud_{index}", (x, -1.25, z - 18.0), (sx, 0.06, sz), mats["cloud"], 2)
        cloud.rotation_euler.y = rot


def create_ground_and_path(target, mats):
    ground = root("Exact_ground", target)
    # The walkable village occupies the upper shelf.  The railway sits on a
    # visibly lower ravine shelf instead of sharing the plaza floor.
    # Stop the upper shelf at x ~= 10 so the right-hand ravine is genuinely
    # open.  A single full-width slab would bury the rails and stream.
    box(ground, "Ground_mass", (-4.0, 68.0, -0.45), (84.0, 196.0, 0.90), mats["grass"], bevel=0.08)
    box(ground, "Upper_valley_ground", (-4.0, 145.0, -0.34), (86.0, 54.0, 0.68), mats["grass_light"], rotation=(0.004, 0.006, -0.004), bevel=0.45)
    box(ground, "Rail_ravine_floor", (35.5, 112.0, -2.30), (16.0, 130.0, 0.64), mats["stone_dark"], rotation=(0.006, -0.018, -0.012), bevel=0.48)
    box(ground, "Rail_ravine_grass", (35.5, 112.0, -1.92), (14.0, 128.0, 0.18), mats["grass_dark"], rotation=(0.006, -0.018, -0.012), bevel=0.48)

    points = MAIN_PATH_POINTS
    widths = [14.0, 13.5, 12.8, 12.0, 10.8, 9.3, 8.0, 6.8, 5.8, 5.0, 4.8, 5.2, 5.5, 5.2, 5.8, 5.5, 6.2]
    create_ribbon("Main_cobblestone_path", points, widths, 0.035, mats["stone_light"], target)

    stone_mats = [mats["stone_light"], mats["stone"], mats["stone_mid"]]
    index = 0
    y = -26.2
    while y < 161.5:
        width = path_width(y)
        center = path_center(y)
        x = center - width * 0.46
        row_shift = random.uniform(-0.35, 0.35)
        while x < center + width * 0.46:
            w = random.uniform(0.75, 1.35)
            d = random.uniform(0.58, 1.08)
            stone = irregular_prism(
                ground,
                f"Cobble_{index:03d}",
                (x + row_shift, y + random.uniform(-0.16, 0.16), 0.085 + random.uniform(0, 0.018)),
                w,
                d,
                0.075,
                random.choice(stone_mats),
                random.uniform(-0.12, 0.12),
            )
            stone.rotation_euler.x = random.uniform(-0.018, 0.018)
            x += w + random.uniform(0.12, 0.27)
            index += 1
        y += random.uniform(0.82, 1.06)

    for side in (-1, 1):
        x = -19.5 if side < 0 else 17.0
        box(ground, f"Grass_bank_{side}", (x, 68.0, 0.04), (13.5, 190.0, 0.14), mats["grass_light"], rotation=(0, 0, 0.012 * side), bevel=0.40)


def create_tree(name, x, y, scale, target, mats, conifer=False):
    parent = root(name, target, (x, y, 0.02))
    cylinder(parent, name + "_trunk", (0, 0, 1.45 * scale), 0.18 * scale, 2.9 * scale, mats["wood"], vertices=8)
    if conifer:
        for index, (z, radius) in enumerate(((1.9, 0.82), (2.7, 0.68), (3.45, 0.50))):
            cone(parent, f"{name}_cone_{index}", (0, 0, z * scale), radius * scale, 1.8 * scale, mats["grass_dark" if index == 0 else "grass"], vertices=7)
    else:
        clusters = (
            (-0.65, 0, 2.75, 0.95, "grass_dark"), (0.55, 0.06, 2.80, 1.12, "grass"),
            (0, -0.02, 3.55, 1.05, "grass_light"), (-1.08, 0.06, 3.48, 0.78, "grass"),
            (1.05, 0.04, 3.50, 0.82, "grass_dark"),
        )
        for index, (lx, ly, lz, radius, shade) in enumerate(clusters):
            sphere(parent, f"{name}_leaf_{index}", (lx * scale, ly * scale, lz * scale), (radius * scale, radius * 0.76 * scale, radius * scale), mats[shade], 2)
    return parent


def create_fence(name, start, end, target, mats, height=1.25):
    parent = root(name, target)
    a, b = Vector(start), Vector(end)
    delta = b - a
    length = delta.length
    angle = math.atan2(delta.y, delta.x)
    count = max(2, int(length / 1.55) + 1)
    for index in range(count):
        p = a.lerp(b, index / (count - 1))
        box(parent, f"{name}_post_{index}", (p.x, p.y, height * 0.5), (0.13, 0.13, height), mats["plaster"], bevel=0.018)
    midpoint = (a + b) * 0.5
    for z in (0.42, 0.92):
        box(parent, f"{name}_rail_{z}", (midpoint.x, midpoint.y, z), (length, 0.11, 0.11), mats["plaster"], rotation=(0, 0, angle), bevel=0.016)


def create_chai_stall(target, mats):
    parent = root("REFERENCE_CHAI_STALL", target, (12.0, -8.0, 0.08))
    parent.scale.z = 1.65
    box(parent, "Chai_stall_base", (0, 0, 1.45), (6.2, 3.7, 2.9), mats["teal"], bevel=0.08)
    box(parent, "Chai_front_opening", (0, -1.88, 2.05), (4.6, 0.08, 1.65), mats["teal_dark"], bevel=0.04)
    box(parent, "Chai_counter", (0, -2.10, 1.25), (5.25, 0.62, 0.28), mats["wood"], bevel=0.05)
    box(parent, "Chai_roof", (0, -0.15, 3.72), (7.1, 4.8, 0.28), mats["yellow"], rotation=(0.10, 0, 0), bevel=0.06)
    for stripe in range(-5, 6):
        box(parent, f"Roof_groove_{stripe}", (stripe * 0.58, -0.15, 3.88), (0.045, 4.45, 0.05), mats["wood"], rotation=(0.10, 0, 0), bevel=0.008)
    for x in (-2.65, 2.65):
        box(parent, f"Chai_post_{x}", (x, -1.75, 2.25), (0.16, 0.16, 3.2), mats["wood"], bevel=0.02)
    box(parent, "Chai_bench", (0.5, -3.10, 0.62), (4.1, 0.62, 0.22), mats["wood"], bevel=0.04)
    for x in (-1.25, 2.25):
        box(parent, f"Chai_bench_leg_{x}", (x, -3.10, 0.31), (0.18, 0.50, 0.62), mats["wood"], bevel=0.02)
    for index, x in enumerate((-2.2, -1.65, -1.10, -0.55)):
        cylinder(parent, f"Chai_glass_{index}", (x, -2.18, 1.62), 0.12, 0.38, mats["plaster"], vertices=10)
    sphere(parent, "Tea_kettle", (0.55, -2.14, 1.66), (0.48, 0.36, 0.42), mats["plaster_shadow"], 2)
    cylinder(parent, "Kettle_lid", (0.55, -2.14, 2.08), 0.22, 0.10, mats["ink"], vertices=10)
    box(parent, "Kettle_spout", (0.02, -2.14, 1.76), (0.78, 0.16, 0.15), mats["plaster_shadow"], rotation=(0, -0.25, 0), bevel=0.03)
    for index, x in enumerate((-2.6, -0.9, 0.8, 2.5)):
        cylinder(parent, f"Chai_roof_bell_{index}", (x, -2.05, 3.36), 0.10, 0.24, mats["yellow"], vertices=9)

    # Slightly in front of the counter so the face reads clearly from the
    # reference camera, as it does in the concept art.
    vendor = root("CHAI_VENDOR", target, (12.0, -10.26, 2.18))
    sphere(vendor, "Vendor_body", (0, 0, 0.54), (0.45, 0.32, 0.58), mats["teal_dark"], 2, True)
    sphere(vendor, "Vendor_head", (0, -0.05, 1.35), (0.31, 0.29, 0.35), mats["skin"], 2, True)
    sphere(vendor, "Vendor_hair", (0, 0.01, 1.55), (0.32, 0.28, 0.22), mats["hair"], 2)
    for side in (-1, 1):
        sphere(vendor, f"Vendor_eye_{side}", (side * 0.10, -0.29, 1.38), (0.035, 0.025, 0.05), mats["ink"], 1)
    box(vendor, "Vendor_moustache", (0, -0.31, 1.26), (0.24, 0.035, 0.055), mats["hair"], bevel=0.02)


def create_shrine(target, mats):
    terrace = root("REFERENCE_SHRINE_TERRACE", target)
    box(terrace, "Shrine_terrace_cliff", (5.8, 25.5, 0.75), (9.0, 8.0, 1.50), mats["stone_mid"], bevel=0.18)
    box(terrace, "Shrine_terrace_grass", (5.8, 25.4, 1.55), (8.55, 7.45, 0.16), mats["grass_light"], bevel=0.20)
    for index, (x, y, sx, sz) in enumerate((
        (2.35, 21.48, 1.45, 0.46), (4.00, 21.46, 1.35, 0.55), (5.80, 21.45, 1.45, 0.42),
        (7.60, 21.46, 1.35, 0.55), (9.25, 21.48, 1.42, 0.46),
    )):
        box(terrace, f"Terrace_masonry_{index}", (x, y, 0.75 + (index % 2) * 0.08), (sx, 0.10, sz), mats["stone_light"], bevel=0.07)
    parent = root("REFERENCE_CHHATRI_SHRINE", target, (5.8, 25.3, 1.58))
    parent.scale = (1.00, 1.08, 1.08)
    box(parent, "Shrine_lower_platform", (0, 0, 0.28), (7.1, 6.0, 0.56), mats["stone_mid"], bevel=0.07)
    box(parent, "Shrine_upper_platform", (0, 0.25, 0.66), (5.9, 4.9, 0.36), mats["plaster"], bevel=0.05)
    for index in range(4):
        box(parent, f"Shrine_step_{index}", (0, -3.05 - index * 0.35, 0.12 + index * 0.12), (4.4 - index * 0.25, 0.72, 0.22 + index * 0.06), mats["stone_light"], bevel=0.04)
    for index, (x, y) in enumerate(((-2.0, -1.55), (2.0, -1.55), (-2.0, 1.55), (2.0, 1.55))):
        box(parent, f"Shrine_column_{index}", (x, y, 2.55), (0.50, 0.50, 3.9), mats["plaster"], bevel=0.05)
        box(parent, f"Shrine_cap_{index}", (x, y, 4.52), (0.78, 0.72, 0.24), mats["stone_light"], bevel=0.035)
        box(parent, f"Shrine_foot_{index}", (x, y, 0.72), (0.72, 0.72, 0.28), mats["stone_light"], bevel=0.035)
    box(parent, "Shrine_roof_base", (0, 0, 4.72), (5.7, 4.5, 0.30), mats["wood"], bevel=0.06)
    for index, (z, sx, sy) in enumerate(((5.02, 4.8, 3.8), (5.40, 3.8, 3.0), (5.76, 2.8, 2.2), (6.10, 1.8, 1.45))):
        box(parent, f"Shrine_roof_tier_{index}", (0, 0, z), (sx, sy, 0.34), mats["plaster"], bevel=0.10)
    cone(parent, "Shrine_finial", (0, 0, 6.70), 0.30, 0.95, mats["yellow"], vertices=7)
    sphere(parent, "Shrine_finial_ball", (0, 0, 7.22), (0.19, 0.19, 0.24), mats["orange"], 2)
    for index, x in enumerate((-1.6, -0.55, 0.55, 1.6)):
        world_x = 5.8 + x
        world_y = 25.3 - 2.15 * 1.08
        curve_object(f"Bell_rope_{index}", [(world_x, world_y, 1.58 + 4.58 * 1.08), (world_x, world_y, 1.58 + 3.92 * 1.08)], mats["ink"], target, 0.018)
        cylinder(parent, f"Shrine_bell_{index}", (x, -2.15, 3.78), 0.15, 0.30, mats["yellow"], vertices=10)
    # Marigold garland scallops across the roof.
    for segment in range(5):
        x0 = -2.5 + segment
        points = []
        for step in range(7):
            t = step / 6
            points.append((5.8 + (x0 + t) * 1.00, 22.98, 6.55 - math.sin(math.pi * t) * 0.41))
        curve_object(f"Marigold_scallop_{segment}", points, mats["orange"], target, 0.055)
    create_fence("Shrine_foreground_fence", (1.4, 21.4, 0), (10.2, 21.4, 0), target, mats, 1.15)


def create_house(name, x, y, width, depth, height, target, mats, roof="teal", balcony=True, base_z=0.08):
    parent = root(name, target, (x, y, base_z))
    if base_z > 0.10:
        box(parent, name + "_retaining_wall", (0, 0, -base_z * 0.5), (width + 1.0, depth + 1.0, base_z), mats["stone_mid"], bevel=0.10)
    box(parent, name + "_body", (0, 0, height * 0.5), (width, depth, height), mats["plaster"], bevel=0.07)
    box(parent, name + "_roof", (0, 0, height + 0.18), (width + 0.45, depth + 0.45, 0.36), mats[roof], bevel=0.05)
    box(parent, name + "_base_trim", (0, -depth * 0.51, 0.28), (width + 0.10, 0.16, 0.56), mats["stone_mid"], bevel=0.02)
    floors = max(1, int(height / 2.3))
    for floor in range(floors):
        z = 1.25 + floor * 2.05
        for index, wx in enumerate((-width * 0.27, width * 0.27)):
            box(parent, f"{name}_window_{floor}_{index}", (wx, -depth * 0.51, z), (0.72, 0.12, 0.86), mats["teal_dark"], bevel=0.04)
            box(parent, f"{name}_window_trim_{floor}_{index}", (wx, -depth * 0.53, z), (0.88, 0.06, 1.02), mats["wood"], bevel=0.03)
            box(parent, f"{name}_window_glass_{floor}_{index}", (wx, -depth * 0.57, z), (0.66, 0.04, 0.78), mats["teal_dark"], bevel=0.02)
    box(parent, name + "_door", (0, -depth * 0.55, 0.88), (0.92, 0.14, 1.65), mats["wood"], bevel=0.05)
    if balcony and height > 4:
        box(parent, name + "_balcony", (0, -depth * 0.75, 2.55), (width * 0.78, 1.15, 0.22), mats["stone_light"], bevel=0.04)
        for ix in range(-3, 4):
            box(parent, f"{name}_baluster_{ix}", (ix * width * 0.10, -depth * 1.02, 2.92), (0.07, 0.07, 0.72), mats["teal_dark"], bevel=0.01)
        box(parent, name + "_balcony_rail", (0, -depth * 1.02, 3.28), (width * 0.78, 0.08, 0.08), mats["teal_dark"], bevel=0.01)
    return parent


def create_hillside_houses(target, mats):
    create_house("Arrival_guesthouse", -34.0, -5.0, 5.6, 4.4, 4.5, target, mats, roof="teal_dark", balcony=True, base_z=0.25)
    create_house("Lower_teal_house", -9.0, 10.0, 4.9, 4.0, 3.6, target, mats, roof="teal", balcony=False, base_z=0.55)
    create_house("Upper_house_main", -13.5, 38.0, 6.0, 4.8, 6.3, target, mats, roof="teal_dark", balcony=True, base_z=2.35)
    create_house("Upper_house_right", 2.0, 46.0, 5.1, 4.3, 5.2, target, mats, roof="teal", balcony=True, base_z=1.75)
    create_house("Hilltop_house", 7.0, 61.0, 5.4, 4.4, 5.8, target, mats, roof="teal_dark", balcony=False, base_z=4.25)
    create_house("Tiny_hill_house", -13.5, 56.0, 4.0, 3.4, 3.6, target, mats, roof="teal", balcony=False, base_z=2.65)
    # Cascading stone steps on the visible left side of the lower house.
    for index in range(12):
        x = -14.0 - index * 0.12
        y = 35.0 + index * 1.75
        box(root("Terrace_stairs", target) if index == 0 else stair_root, f"Hill_step_{index}", (x, y, 0.12 + index * 0.18), (3.4, 0.74, 0.22 + index * 0.05), mats["stone_light"], bevel=0.035)
        if index == 0:
            stair_root = bpy.context.object.parent
    create_fence("Hill_lane_railing", (-16.0, 34.0, 0), (-17.0, 56.0, 0), target, mats, 1.10)
    # A gold rooftop finial is a strong Indian silhouette from the reference.
    finial = root("Hilltop_temple_finial", target, (7.0, 61.0, 10.25))
    cone(finial, "Finial_spire", (0, 0, 0.45), 0.26, 0.90, mats["yellow"], vertices=6)
    sphere(finial, "Finial_ball", (0, 0, 0.94), (0.15, 0.15, 0.18), mats["orange"], 2)


def create_upper_valley_district(target, mats):
    """A second, spacious district so the railway is a journey, not a backdrop."""
    create_house("Orchard_house", -15.0, 96.0, 5.6, 4.6, 4.8, target, mats, roof="teal", balcony=True, base_z=0.80)
    create_house("Cedar_lodge", 12.5, 111.0, 6.2, 5.0, 5.4, target, mats, roof="teal_dark", balcony=True, base_z=1.10)
    create_house("Upper_valley_inn", -10.0, 139.0, 7.2, 5.4, 6.2, target, mats, roof="teal_dark", balcony=True, base_z=0.68)
    create_house("Station_quarters", -30.0, 158.0, 5.4, 4.5, 4.6, target, mats, roof="teal", balcony=False, base_z=0.46)

    square = root("UPPER_VALLEY_SQUARE", target)
    box(square, "Upper_valley_square", (1.0, 123.5, 0.10), (13.0, 10.5, 0.20), mats["stone_light"], bevel=0.32)
    for row in range(5):
        for column in range(6):
            irregular_prism(
                square,
                f"Upper_square_stone_{row}_{column}",
                (-3.8 + column * 1.85 + random.uniform(-0.12, 0.12), 119.8 + row * 1.78 + random.uniform(-0.10, 0.10), 0.23),
                1.45,
                1.20,
                0.08,
                mats["stone" if (row + column) % 2 else "stone_mid"],
                random.uniform(-0.10, 0.10),
            )

    shrine = root("UPPER_WAYSIDE_SHRINE", target, (12.5, 124.5, 0.18))
    box(shrine, "Wayside_shrine_plinth", (0, 0, 0.32), (3.2, 2.8, 0.64), mats["stone_mid"], bevel=0.08)
    for side in (-1, 1):
        box(shrine, f"Wayside_shrine_column_{side}", (side * 1.05, 0, 1.72), (0.34, 0.34, 2.8), mats["plaster"], bevel=0.04)
    box(shrine, "Wayside_shrine_roof", (0, 0, 3.20), (3.6, 3.2, 0.34), mats["yellow"], bevel=0.08)
    cone(shrine, "Wayside_shrine_finial", (0, 0, 3.80), 0.28, 0.88, mats["orange"], vertices=7)
    cylinder(shrine, "Wayside_shrine_bell", (0, -0.25, 2.35), 0.18, 0.34, mats["yellow"], vertices=10)

    create_fence("Upper_valley_overlook_fence", (15.5, 118.0, 0), (16.5, 137.0, 0), target, mats, 1.22)
    for index, (x, y, scale, conifer) in enumerate((
        (-32.0, 88.0, 1.00, False), (-32.0, 103.0, 0.92, False), (-14.0, 118.0, 0.90, True),
        (12.0, 92.0, 0.88, True), (13.0, 106.0, 1.02, True), (-13.0, 132.0, 1.04, True),
        (-10.0, 151.0, 0.90, True), (29.0, 149.0, 1.08, True), (-32.0, 170.0, 0.98, True),
    )):
        create_tree(f"Upper_valley_tree_{index}", x, y, scale, target, mats, conifer)


def create_exploration_landmarks(target, mats):
    # Optional lakeside detour branching from the upper-village road.
    lake_path = [(-3.0, 34.0), (-12.0, 39.0), (-22.0, 45.0), (-31.0, 50.0)]
    create_ribbon("LAKESIDE_DISCOVERY_TRAIL", lake_path, [3.0, 2.8, 2.55, 2.35], 0.10, mats["stone"], target)
    lake = root("HIDDEN_HILLSIDE_LAKE", target, (-35.0, 52.0, 0.0))
    sphere(lake, "Lake_water", (0, 0, 0.10), (5.7, 3.7, 0.16), mats["water"], 3)
    sphere(lake, "Lake_inner_glow", (-0.3, -0.2, 0.20), (4.3, 2.6, 0.07), mats["water_light"], 2)
    for index in range(16):
        angle = index / 16 * math.tau
        radius_x = 6.0 + random.uniform(-0.25, 0.25)
        radius_y = 4.0 + random.uniform(-0.20, 0.20)
        sphere(lake, f"Lake_edge_rock_{index}", (math.cos(angle) * radius_x, math.sin(angle) * radius_y, 0.18), (0.55, 0.42, 0.35), mats["stone_mid"], 1)
    box(lake, "Lake_bench_seat", (3.7, -3.2, 0.55), (2.8, 0.46, 0.20), mats["wood"], rotation=(0, 0, -0.26), bevel=0.04)
    for x in (2.8, 4.6):
        box(lake, f"Lake_bench_leg_{x}", (x, -3.2, 0.28), (0.16, 0.35, 0.55), mats["wood"], rotation=(0, 0, -0.26), bevel=0.02)

    # A quiet forest clearing breaks up the journey to the bridge.
    clearing = root("FOREST_LANGUAGE_CLEARING", target, (7.0, 51.0, 0.0))
    cylinder(clearing, "Clearing_stone_ring", (0, 0, 0.16), 3.4, 0.22, mats["stone_mid"], vertices=18)
    cylinder(clearing, "Clearing_grass", (0, 0, 0.30), 3.0, 0.14, mats["grass_light"], vertices=18)
    for index in range(6):
        angle = index / 6 * math.tau
        box(clearing, f"Clearing_seat_{index}", (math.cos(angle) * 2.2, math.sin(angle) * 2.2, 0.52), (1.25, 0.40, 0.25), mats["wood"], rotation=(0, 0, angle + math.pi / 2), bevel=0.04)


def create_district_ridges(target, mats):
    """Terrain gates hide later districts and make the road reveal them gradually."""
    ridge_root = root("EXPLORATION_DISTRICT_RIDGES", target)
    ridge_specs = (
        (17.0, -42.0, 52.0, 5.2, 2.6),
        (41.0, -43.0, 53.0, 5.8, 3.0),
        (63.0, -44.0, 54.0, 6.2, 3.4),
        (91.0, -44.0, 55.0, 6.8, 3.8),
        (119.0, -45.0, 55.0, 7.2, 4.2),
        (151.0, -45.0, 56.0, 7.8, 4.6),
    )
    for ridge_index, (y, left_x, right_x, radius, height) in enumerate(ridge_specs):
        for side_index, x in enumerate((left_x, right_x)):
            shade = "grass_dark" if (ridge_index + side_index) % 2 else "grass"
            sphere(ridge_root, f"Ridge_{ridge_index}_{side_index}_grass", (x, y, height * 0.52), (radius, 3.8, height), mats[shade], 2)
            sphere(ridge_root, f"Ridge_{ridge_index}_{side_index}_rock", (x + (1.1 if side_index == 0 else -1.1), y - 0.8, 0.55), (radius * 0.58, 2.5, 1.25), mats["stone_dark"], 2)
        for tree_index, tx in enumerate((left_x - 2.0, left_x + 2.2, right_x - 2.0, right_x + 2.0)):
            create_tree(f"Ridge_tree_{ridge_index}_{tree_index}", tx, y + random.uniform(-2.2, 2.2), random.uniform(0.78, 1.08), target, mats, conifer=ridge_index > 0)


def create_waterfall_and_cliff(target, mats):
    base_x, base_y = -35.0, 100.0
    parent = root("REFERENCE_WATERFALL", target, (base_x, base_y, 0.15))
    rock_specs = (
        (-2.0, 0.9, 1.7, 2.6, 1.8, 2.1), (0.0, 1.1, 2.6, 2.8, 2.0, 3.0),
        (2.3, 0.9, 1.8, 2.5, 1.8, 2.2), (-2.2, 1.5, 4.6, 2.2, 1.7, 2.8),
        (2.0, 1.4, 4.8, 2.5, 1.8, 3.0), (0.0, 1.8, 6.5, 3.8, 2.3, 2.8),
    )
    for index, (x, y, z, sx, sy, sz) in enumerate(rock_specs):
        sphere(parent, f"Waterfall_rock_{index}", (x, y, z), (sx, sy, sz), mats["stone_dark" if index % 3 == 0 else "stone_mid"], 2)
    # Irregular silhouette sheets read as falling water rather than columns.
    sheet_specs = (
        ("main", [(-1.35, 4.95), (0.08, 4.82), (0.22, 4.15), (-0.03, 3.55), (0.28, 2.80), (0.08, 1.95), (0.30, 1.10), (-0.18, -0.72), (-1.18, -0.75), (-0.91, 0.78), (-1.13, 1.72), (-0.88, 2.75), (-1.18, 3.65)]),
        ("side", [(0.24, 4.55), (1.12, 4.40), (1.22, 3.75), (1.03, 3.18), (1.30, 2.48), (1.08, 1.62), (1.22, 0.72), (0.52, -0.65), (0.34, 0.78), (0.52, 1.74), (0.32, 2.72), (0.52, 3.55)]),
    )
    for index, (label, silhouette) in enumerate(sheet_specs):
        vertices = [(x, -1.43 - index * 0.015, z) for x, z in silhouette]
        mesh_object(f"Waterfall_sheet_{label}", vertices, [tuple(range(len(vertices)))], mats["water"], target).parent = parent
        glint_x = -0.72 if index == 0 else 0.74
        curve_object(f"Waterfall_glint_{label}", [(base_x + glint_x, base_y - 1.44, 4.42), (base_x - 0.08 + glint_x, base_y - 1.46, 3.40), (base_x + 0.09 + glint_x, base_y - 1.48, 2.45), (base_x - 0.01 + glint_x, base_y - 1.50, 1.18)], mats["water_light"], target, 0.065)
    sphere(parent, "Waterfall_pool", (0.15, -1.18, -0.72), (3.0, 1.75, 0.24), mats["water"], 2)
    create_ribbon("Waterfall_stream", [(base_x + 0.1, base_y - 1.6), (base_x + 0.5, base_y - 5.0), (base_x + 1.1, base_y - 9.0), (base_x + 1.6, base_y - 13.5), (base_x + 2.0, base_y - 19.0)], [2.1, 1.75, 1.35, 1.05, 0.82], -1.52, mats["water"], target)
    create_ribbon("Waterfall_foam", [(base_x + 0.12, base_y - 1.7), (base_x + 0.48, base_y - 5.0), (base_x + 1.02, base_y - 8.9)], [0.42, 0.32, 0.22], -1.44, mats["water_light"], target)
    create_ribbon("WATERFALL_DISCOVERY_TRAIL", [(-2.0, 91.0), (-12.0, 93.0), (-22.0, 96.0), (-31.5, 98.5)], [2.8, 2.7, 2.55, 2.35], 0.11, mats["stone"], target)
    for index, (x, y) in enumerate(((-39.5, 102.5), (-38.2, 106.0), (-35.3, 106.5), (-32.0, 103.0), (-31.5, 96.5), (-39.0, 95.0))):
        create_tree(f"Waterfall_pine_{index}", x, y, random.uniform(0.70, 1.05), target, mats, conifer=True)


def create_railway_trail(target, mats):
    """A genuine cross-map hike from the lower village to the mountain railway."""
    points = [
        (2.0, 18.0), (6.5, 31.0), (10.0, 45.0), (12.0, 60.0),
        (13.0, 76.0), (13.0, 92.0), (14.0, 110.0), (15.0, 128.0),
        (18.0, 143.0), (30.5, 152.0),
    ]
    widths = [3.6, 3.5, 3.4, 3.25, 3.1, 3.0, 2.9, 2.8, 2.75, 2.7]
    create_ribbon("Railway_trail_cliff_ledge", points[4:], [5.1, 5.0, 4.8, 4.6, 4.4, 4.3], -0.18, mats["stone_dark"], target)
    create_ribbon("RAILWAY_WALKING_TRAIL", points, widths, 0.12, mats["stone"], target)

    trail = root("Railway_trail_details", target)
    stone_index = 0
    for segment in range(len(points) - 1):
        a = Vector(points[segment])
        b = Vector(points[segment + 1])
        distance = (b - a).length
        count = max(3, int(distance / 0.85))
        direction = b - a
        angle = math.atan2(direction.y, direction.x)
        side = Vector((-direction.y, direction.x)).normalized()
        for step in range(count):
            t = (step + 0.5) / count
            p = a.lerp(b, t)
            p += side * random.uniform(-0.45, 0.45)
            irregular_prism(trail, f"Trail_stone_{stone_index:03d}", (p.x, p.y, 0.18), random.uniform(0.70, 1.0), random.uniform(0.55, 0.78), 0.09, mats["stone_light"], angle + random.uniform(-0.16, 0.16))
            stone_index += 1

    # Bridge and guard rails make the route physically and visually distinct.
    bridge = root("RAILWAY_TRAIL_BRIDGE", target)
    box(bridge, "Bridge_deck", (13.5, 101.0, 0.35), (3.5, 16.0, 0.38), mats["wood"], rotation=(0, 0, -0.055), bevel=0.06)
    for index in range(18):
        t = index / 17
        x = 13.05 + 0.90 * t
        y = 93.5 + 15.0 * t
        box(bridge, f"Bridge_plank_{index}", (x, y, 0.58), (3.35, 0.13, 0.10), mats["stone_light"], rotation=(0, 0, -0.055), bevel=0.015)
    create_fence("Trail_bridge_left_rail", (11.3, 93.4, 0), (12.2, 108.8, 0), target, mats, 1.22)
    create_fence("Trail_bridge_right_rail", (14.8, 93.2, 0), (15.7, 108.5, 0), target, mats, 1.22)

    # A small destination halt, visible only after following the trail.
    halt = root("REMOTE_RAILWAY_HALT", target, (31.0, 151.0, -0.05), rotation=(0, 0, -0.06))
    box(halt, "Halt_platform", (1.8, 0, 0.34), (9.5, 3.2, 0.68), mats["stone_mid"], bevel=0.12)
    box(halt, "Halt_shelter", (-0.2, 0.65, 1.65), (4.2, 2.2, 2.9), mats["plaster"], bevel=0.08)
    box(halt, "Halt_roof", (-0.2, 0.65, 3.30), (5.2, 3.2, 0.30), mats["teal_dark"], bevel=0.06)
    box(halt, "Halt_sign", (-2.55, -0.75, 1.82), (2.05, 0.16, 0.82), mats["yellow"], bevel=0.05)
    for x in (-1.65, 1.25):
        box(halt, f"Halt_post_{x}", (x, -0.72, 0.90), (0.15, 0.15, 1.80), mats["wood"], bevel=0.02)


TRAIN_ROUTE_POINTS = [
    (-28.0, 154.0, 8.05), (-20.0, 158.0, 8.12), (5.0, 159.0, 8.14),
    (29.0, 157.0, 8.08), (47.0, 146.0, 7.72), (57.0, 124.0, 5.92),
    (62.0, 97.0, 4.02), (61.0, 68.0, 2.58), (57.0, 39.0, 1.24),
]


def create_railway_and_train(target, mats):
    # A long mountain railway with enough scale to become a destination.
    points = TRAIN_ROUTE_POINTS
    create_ribbon_3d("Rail_track_bed", [(x, y, z - 0.18) for x, y, z in points], [3.6] * len(points), mats["stone_mid"], target)
    for offset, name in ((-0.74, "Track_left_rail"), (0.74, "Track_right_rail")):
        shifted = []
        for index, point in enumerate(points):
            previous = Vector(points[max(0, index - 1)][:2])
            following = Vector(points[min(len(points) - 1, index + 1)][:2])
            tangent = (following - previous).normalized()
            side = Vector((-tangent.y, tangent.x))
            shifted.append((point[0] + side.x * offset, point[1] + side.y * offset, point[2] + 0.08))
        curve_object(name, shifted, mats["ink"], target, 0.105)
    sleeper_root = root("Rail_sleepers", target)
    for index in range(92):
        t = index / 91
        segment = min(len(points) - 2, int(t * (len(points) - 1)))
        local_t = t * (len(points) - 1) - segment
        a = Vector(points[segment])
        b = Vector(points[segment + 1])
        p = a.lerp(b, local_t)
        direction = b - a
        angle = math.atan2(direction.y, direction.x) + math.pi / 2
        box(sleeper_root, f"Rail_sleeper_{index}", tuple(p), (2.20, 0.24, 0.14), mats["wood"], rotation=(0, 0, angle), bevel=0.018)

    route = root("TRAIN_ROUTE_WAYPOINTS", target)
    for index, point in enumerate(points):
        marker = root(f"TRAIN_ROUTE_{index:02d}", target, point)
        marker.parent = route

    train = root("TOY_TRAIN", target, points[0], rotation=(0, 0, math.radians(170)))
    train.scale = (0.95, 0.95, 0.95)
    box(train, "Engine_body", (0, 0, 0.92), (1.78, 3.10, 1.34), mats["teal_dark"], bevel=0.12)
    box(train, "Engine_cab", (0, 0.88, 1.82), (1.82, 1.42, 1.72), mats["orange"], bevel=0.10)
    box(train, "Engine_cab_roof", (0, 0.88, 2.78), (2.12, 1.78, 0.24), mats["teal_dark"], bevel=0.07)
    for side in (-1, 1):
        box(train, f"Engine_cab_window_{side}", (side * 0.915, 0.73, 1.98), (0.06, 0.72, 0.66), mats["water_dark"], bevel=0.03)
    cylinder(train, "Engine_boiler", (0, -0.92, 1.58), 0.64, 1.88, mats["orange"], rotation=(math.pi / 2, 0, 0), vertices=14)
    cylinder(train, "Engine_chimney", (0, -1.42, 2.48), 0.25, 0.86, mats["ink"], vertices=12)
    cone(train, "Engine_chimney_cap", (0, -1.42, 2.96), 0.38, 0.34, mats["ink"], vertices=12)
    for puff_index, (px, py, pz, size) in enumerate(((0.0, -1.35, 3.50, 0.44), (0.16, -0.72, 3.92, 0.56), (0.34, 0.05, 4.30, 0.68))):
        sphere(train, f"Train_smoke_{puff_index}", (px, py, pz), (size, size * 0.78, size), mats["cloud"], 2)
    cylinder(train, "Engine_face", (0, -1.62, 1.54), 0.56, 0.15, mats["yellow"], rotation=(math.pi / 2, 0, 0), vertices=14)
    for wheel_index, (wx, wy) in enumerate(((-0.92, -0.88), (0.92, -0.88), (-0.92, 0.78), (0.92, 0.78))):
        cylinder(train, f"Train_wheel_engine_{wheel_index}", (wx, wy, 0.62), 0.40, 0.20, mats["ink"], rotation=(0, math.pi / 2, 0), vertices=14)
    for car_index in range(1, 6):
        y = 3.18 * car_index
        colors = (mats["yellow"], mats["orange"], mats["teal"], mats["red"], mats["yellow"])
        color = colors[car_index - 1]
        box(train, f"Train_car_{car_index}", (0, y, 1.16), (1.88, 2.66, 1.65), color, bevel=0.11)
        box(train, f"Train_car_roof_{car_index}", (0, y, 2.08), (2.14, 2.96, 0.25), mats["teal_dark"], bevel=0.08)
        box(train, f"Train_coupler_{car_index}", (0, y - 1.66, 0.76), (0.20, 0.72, 0.18), mats["ink"], bevel=0.02)
        for side in (-1, 1):
            for window_index in (-1, 1):
                box(train, f"Train_window_{car_index}_{side}_{window_index}", (side * 0.95, y + window_index * 0.54, 1.46), (0.06, 0.76, 0.68), mats["water_dark"], bevel=0.035)
            cylinder(train, f"Train_wheel_{car_index}_{side}_front", (side * 0.96, y - 0.82, 0.52), 0.34, 0.17, mats["ink"], rotation=(0, math.pi / 2, 0), vertices=14)
            cylinder(train, f"Train_wheel_{car_index}_{side}_rear", (side * 0.96, y + 0.82, 0.52), 0.34, 0.17, mats["ink"], rotation=(0, math.pi / 2, 0), vertices=14)

    # The broad northern viaduct is the map's main silhouette and keeps the
    # train far above the starting city, exactly as in the reference.
    viaduct = root("NORTHERN_RAIL_VIADUCT", target)
    support_x = (-32.0, -22.0, -12.0, -2.0, 16.0, 26.0, 36.0)
    for index, x in enumerate(support_x):
        box(viaduct, f"Viaduct_pillar_{index}", (x, 157.0, 4.65), (1.25, 3.6, 6.8), mats["stone_mid"], bevel=0.10)
    for index, (left_x, right_x) in enumerate(zip(support_x, support_x[1:])):
        center_x = (left_x + right_x) * 0.5
        radius = (right_x - left_x) * 0.5 - 0.65
        arch_points = []
        for step in range(13):
            angle = step / 12 * math.pi
            arch_points.append((center_x + math.cos(angle) * radius, 155.15, 4.15 + math.sin(angle) * min(4.6, radius * 0.80)))
        curve_object(f"Viaduct_arch_{index}", arch_points, mats["stone_light"], target, 0.42)
    box(viaduct, "Viaduct_deck", (1.0, 157.0, 7.55), (86.0, 4.0, 0.70), mats["stone_mid"], bevel=0.12)

    tunnel = root("RAIL_TUNNEL", target, (-29.0, 154.0, 7.0))
    sphere(tunnel, "Rail_tunnel_left_rock", (-2.0, 0, 2.1), (2.6, 2.4, 3.8), mats["stone_dark"], 2)
    sphere(tunnel, "Rail_tunnel_right_rock", (2.0, 0, 2.1), (2.6, 2.4, 3.8), mats["stone_dark"], 2)
    sphere(tunnel, "Rail_tunnel_cap_rock", (0, 0, 4.6), (4.3, 2.5, 2.6), mats["stone_mid"], 2)
    box(tunnel, "Rail_tunnel_mouth", (0, -2.05, 2.0), (3.6, 0.18, 3.6), mats["ink"], bevel=0.72)


def create_bunting(target, mats):
    def string(name, start, end, count):
        a, b = Vector(start), Vector(end)
        line_points = []
        vertices = []
        faces = []
        for index in range(count):
            t = index / (count - 1)
            center = a.lerp(b, t)
            center.z -= math.sin(math.pi * t) * 0.55
            line_points.append(tuple(center))
            vertices.extend(((center.x - 0.17, center.y, center.z), (center.x + 0.17, center.y, center.z), (center.x, center.y, center.z - 0.48)))
            faces.append((index * 3, index * 3 + 1, index * 3 + 2))
        curve_object(name + "_rope", line_points, mats["ink"], target, 0.018)
        mesh_object(name, vertices, faces, mats["yellow"], target)
    string("Shrine_bunting", (0.2, 25.2, 5.25), (11.2, 25.8, 5.35), 15)
    string("Village_bunting", (-14.0, 38.0, 6.5), (1.0, 45.0, 5.9), 17)


def create_small_details(target, mats):
    for index, (x, y, color) in enumerate(((-8.8, -5.0, "orange"), (-8.0, 7.0, "yellow"), (9.0, -4.0, "orange"), (10.0, 7.0, "yellow"), (4.0, 22.0, "orange"), (5.0, 38.0, "yellow"), (2.0, 58.0, "orange"))):
        planter = root(f"Flower_planter_{index}", target, (x, y, 0.10))
        cylinder(planter, "pot", (0, 0, 0.32), 0.30, 0.55, mats["wood"], vertices=9)
        sphere(planter, "foliage", (0, 0, 0.72), (0.38, 0.34, 0.34), mats["grass_dark"], 2)
        for petal in range(4):
            angle = petal / 4 * math.tau
            sphere(planter, f"flower_{petal}", (math.cos(angle) * 0.22, math.sin(angle) * 0.14, 0.90), (0.13, 0.08, 0.13), mats[color], 1)
    create_fence("Right_overlook_fence", (7.0, 8.0, 0), (9.8, 13.0, 0), target, mats, 1.3)
    create_fence("Waterfall_fence", (-30.5, 92.0, 0), (-32.0, 98.2, 0), target, mats, 1.15)


def create_drivable_vehicles(target, mats):
    auto = root("AUTO_RICKSHAW", target, (30.0, 4.0, 0.24), rotation=(0, 0, -math.pi / 2))
    box(auto, "Auto_chassis", (0, 0, 0.48), (1.75, 2.85, 0.34), mats["ink"], bevel=0.10)
    box(auto, "Auto_rear_body", (0, -0.48, 1.22), (1.82, 1.55, 1.48), mats["yellow"], bevel=0.16)
    box(auto, "Auto_front_apron", (0, 0.92, 0.92), (1.48, 0.82, 1.05), mats["teal"], bevel=0.18)
    box(auto, "Auto_roof", (0, -0.18, 2.28), (2.05, 2.65, 0.28), mats["ink"], bevel=0.13)
    for side in (-1, 1):
        box(auto, f"Auto_roof_post_{side}", (side * 0.78, 0.28, 1.67), (0.12, 0.13, 1.12), mats["ink"], bevel=0.025)
        box(auto, f"Auto_side_opening_{side}", (side * 0.92, -0.38, 1.62), (0.06, 1.14, 0.76), mats["water_dark"], bevel=0.025)
    box(auto, "Auto_windshield", (0, 0.70, 1.62), (1.42, 0.08, 0.82), mats["water_dark"], rotation=(-0.12, 0, 0), bevel=0.04)
    box(auto, "Auto_driver_seat_mesh", (0, 0.10, 0.86), (1.15, 0.58, 0.24), mats["red"], bevel=0.07)
    box(auto, "Auto_passenger_seat", (0, -0.92, 1.00), (1.35, 0.42, 0.48), mats["red"], bevel=0.08)
    cylinder(auto, "Auto_headlight", (0, 1.36, 1.04), 0.28, 0.13, mats["yellow"], rotation=(math.pi / 2, 0, 0), vertices=12)
    for side in (-1, 1):
        cylinder(auto, f"Auto_wheel_rear_{side}", (side * 0.88, -0.72, 0.43), 0.40, 0.22, mats["ink"], rotation=(0, math.pi / 2, 0), vertices=14)
    cylinder(auto, "Auto_wheel_front", (0, 1.17, 0.42), 0.39, 0.24, mats["ink"], rotation=(0, math.pi / 2, 0), vertices=14)
    handle = curve_object("Auto_handlebar", [(-0.48, 1.10, 1.30), (0.0, 1.28, 1.38), (0.48, 1.10, 1.30)], mats["ink"], target, 0.045)
    handle.parent = auto
    handle.location = (0, 0, 0)
    auto_seat = root("AUTO_DRIVER_SEAT", target, (0, 0.12, 1.18))
    auto_seat.parent = auto
    auto_exit = root("AUTO_EXIT_POINT", target, (2.15, -0.05, 0.12))
    auto_exit.parent = auto

    scooter = root("SCOOTER", target, (-62.0, 82.0, 2.26), rotation=(0, 0, 0))
    box(scooter, "Scooter_floorboard", (0, 0, 0.50), (0.62, 1.32, 0.22), mats["teal"], bevel=0.12)
    sphere(scooter, "Scooter_front_fairing", (0, 0.68, 0.92), (0.43, 0.46, 0.70), mats["teal"], 2, True)
    box(scooter, "Scooter_seat_mesh", (0, -0.34, 1.08), (0.58, 1.02, 0.26), mats["ink"], rotation=(0.04, 0, 0), bevel=0.10)
    box(scooter, "Scooter_rear_body", (0, -0.74, 0.84), (0.68, 0.62, 0.55), mats["yellow"], bevel=0.14)
    for label, y in (("front", 0.98), ("rear", -0.94)):
        cylinder(scooter, f"Scooter_wheel_{label}", (0, y, 0.43), 0.39, 0.18, mats["ink"], rotation=(0, math.pi / 2, 0), vertices=16)
        cylinder(scooter, f"Scooter_wheel_hub_{label}", (0, y, 0.43), 0.15, 0.20, mats["stone_light"], rotation=(0, math.pi / 2, 0), vertices=12)
    box(scooter, "Scooter_steering_column", (0, 0.68, 1.30), (0.12, 0.12, 1.18), mats["ink"], rotation=(-0.18, 0, 0), bevel=0.03)
    box(scooter, "Scooter_handlebar", (0, 0.78, 1.84), (1.05, 0.12, 0.12), mats["ink"], bevel=0.03)
    cylinder(scooter, "Scooter_headlight", (0, 0.95, 1.58), 0.22, 0.14, mats["yellow"], rotation=(math.pi / 2, 0, 0), vertices=12)
    scooter_seat = root("SCOOTER_DRIVER_SEAT", target, (0, -0.28, 1.34))
    scooter_seat.parent = scooter
    scooter_exit = root("SCOOTER_EXIT_POINT", target, (1.45, -0.20, 0.12))
    scooter_exit.parent = scooter

    vehicle_spawns = root("DRIVABLE_VEHICLES", target)
    auto.parent = vehicle_spawns
    scooter.parent = vehicle_spawns


# ---------------------------------------------------------------------------
# Himalayan Loop rebuild — macro layout follows Generated image 1 (2).png.
# These functions intentionally keep the stable runtime node contract while
# replacing the former rectangular test map with one authored island.


def create_reference_road_network(target, mats):
    roads = root("INDIA_VEHICLE_ROAD_NETWORK", target)
    loop = VEHICLE_ROAD_LOOP_3D + [VEHICLE_ROAD_LOOP_3D[0]]
    shoulder = create_ribbon_3d("VEHICLE_ROAD_SHOULDER", [(x, y, z - 0.05) for x, y, z in loop], [10.4] * len(loop), mats["road_edge"], target)
    shoulder.parent = roads
    road = create_ribbon_3d("VEHICLE_ROAD_LOOP", loop, [7.6] * len(loop), mats["road"], target)
    road.parent = roads

    def markings(prefix, points, cyclic=False):
        segments = list(zip(points, points[1:]))
        if cyclic:
            segments.append((points[-1], points[0]))
        dash_index = 0
        for start, end in segments:
            a, b = Vector(start), Vector(end)
            delta = b - a
            distance = Vector(delta[:2]).length
            count = max(1, int(distance / 5.7))
            angle = math.atan2(delta.y, delta.x) - math.pi / 2
            for index in range(count):
                p = a.lerp(b, (index + 0.5) / count)
                box(roads, f"{prefix}_dash_{dash_index:03d}", (p.x, p.y, p.z + 0.09), (0.13, 2.05, 0.045), mats["road_edge"], rotation=(0, 0, angle), bevel=0.016)
                dash_index += 1

    markings("Loop_lane", VEHICLE_ROAD_LOOP_3D, cyclic=True)
    for name, points in CITY_ROAD_BRANCHES_3D:
        shoulder = create_ribbon_3d(name + "_SHOULDER", [(x, y, z - 0.05) for x, y, z in points], [9.8] * len(points), mats["road_edge"], target)
        shoulder.parent = roads
        road = create_ribbon_3d(name, points, [7.2] * len(points), mats["road"], target)
        road.parent = roads
        markings(name, points)

    for crossing_index, (x, y, z, angle) in enumerate((
        (-9.0, 0.0, 0.26, -0.09), (-20.0, 53.0, 2.24, -0.11), (0.0, 148.0, 7.24, 0.04),
    )):
        for stripe in range(-3, 4):
            box(roads, f"Pedestrian_crossing_{crossing_index}_{stripe}", (x + stripe * 0.72, y, z), (0.42, 5.6, 0.05), mats["plaster"], rotation=(0, 0, angle), bevel=0.02)

    route = root("ROAD_ROUTE_WAYPOINTS", target)
    for index, point in enumerate(VEHICLE_ROAD_LOOP_3D):
        marker = root(f"ROAD_ROUTE_{index:02d}", target, point)
        marker.parent = route
    return roads


def create_reference_island(target, mats):
    ground = root("Exact_ground", target)
    island_outline = [
        (-35, -32), (8, -35), (40, -25), (58, -5), (67, 28), (70, 68),
        (68, 108), (63, 145), (49, 173), (22, 185), (-10, 183), (-39, 171),
        (-59, 148), (-69, 116), (-72, 78), (-69, 38), (-59, 0),
    ]
    base = create_plateau("Ground_mass", island_outline, 0.0, -11.0, mats["grass"], mats["stone_dark"], target)
    base.parent = ground
    middle_outline = [(-60, 43), (49, 40), (62, 65), (60, 105), (48, 132), (4, 142), (-43, 132), (-62, 103)]
    middle = create_plateau("Middle_hills_ground", middle_outline, 2.0, -1.2, mats["grass_light"], mats["stone_mid"], target)
    middle.parent = ground
    upper_outline = [(-44, 130), (47, 126), (62, 149), (46, 176), (16, 184), (-20, 180), (-49, 158)]
    upper = create_plateau("Upper_valley_ground", upper_outline, 7.0, 1.6, mats["grass"], mats["stone_dark"], target)
    upper.parent = ground

    # Turquoise void and mist below the cliff island reproduce the contained
    # concept-map silhouette without turning the void into walkable terrain.
    box(ground, "Island_mist_sea", (0, 75, -13.0), (620, 620, 1.0), mats["water_dark"], bevel=0)

    path = create_ribbon_3d("Main_cobblestone_path", MAIN_PATH_3D, [path_width(y) for _, y, _ in MAIN_PATH_3D], mats["stone_light"], target)
    path.parent = ground
    stone_mats = [mats["stone_light"], mats["stone"], mats["stone_mid"]]
    stone_index = 0
    for segment in range(len(MAIN_PATH_3D) - 1):
        a, b = Vector(MAIN_PATH_3D[segment]), Vector(MAIN_PATH_3D[segment + 1])
        delta = b - a
        distance = Vector(delta[:2]).length
        rows = max(2, int(distance / 1.05))
        side = Vector((-delta.y, delta.x, 0)).normalized()
        for row in range(rows):
            center = a.lerp(b, (row + 0.5) / rows)
            width = path_width(center.y) * 0.84
            columns = max(3, int(width / 1.15))
            for column in range(columns):
                lateral = ((column + 0.5) / columns - 0.5) * width
                p = center + side * lateral
                irregular_prism(
                    ground, f"Cobble_{stone_index:04d}",
                    (p.x + random.uniform(-0.10, 0.10), p.y + random.uniform(-0.10, 0.10), p.z + 0.075),
                    random.uniform(0.78, 1.18), random.uniform(0.62, 0.94), 0.075,
                    random.choice(stone_mats), random.uniform(-0.16, 0.16),
                )
                stone_index += 1

    # Faceted perimeter rocks make the island read as one mountainous mass.
    cliffs = root("ISLAND_PERIMETER_CLIFFS", target)
    for index, (x, y) in enumerate(island_outline):
        next_x, next_y = island_outline[(index + 1) % len(island_outline)]
        segment = Vector((next_x - x, next_y - y))
        count = max(1, int(segment.length / 9.0))
        for step in range(count):
            t = (step + 0.5) / count
            px = x + (next_x - x) * t
            py = y + (next_y - y) * t
            sphere(cliffs, f"Island_cliff_rock_{index}_{step}", (px, py, -4.8 + random.uniform(-0.7, 0.7)), (random.uniform(3.8, 6.4), random.uniform(3.0, 5.1), random.uniform(5.8, 9.2)), mats["stone_dark" if (index + step) % 2 else "stone_mid"], 2)
    return ground


def create_terraced_hill(parent, name, x, y, base_z, radius_x, radius_y, levels, mats):
    terrace = root(name, parent.users_collection[0], (x, y, base_z))
    terrace.parent = parent
    for level in range(levels):
        shrink = 1.0 - level * 0.105
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=1, depth=0.34)
        retaining = bpy.context.object
        retaining.name = f"{name}_retaining_{level}"
        retaining.parent = terrace
        move_to_collection(retaining, parent.users_collection[0])
        retaining.location = (0, 0, level * 0.34)
        retaining.scale = (radius_x * shrink, radius_y * shrink, 1)
        retaining.data.materials.append(mats["stone_mid"])
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=1, depth=0.13)
        crop = bpy.context.object
        crop.name = f"{name}_crop_{level}"
        crop.parent = terrace
        move_to_collection(crop, parent.users_collection[0])
        crop.location = (0, 0, level * 0.34 + 0.22)
        crop.scale = (radius_x * shrink * 0.96, radius_y * shrink * 0.96, 1)
        crop.data.materials.append(mats["grass_light" if level % 2 else "grass"])
    return terrace


def create_reference_house(name, x, y, base_z, width, depth, height, target, mats, roof="teal", rotation=0.0):
    house = root(name, target, (x, y, base_z), rotation=(0, 0, rotation))
    box(house, name + "_body", (0, 0, height * 0.5), (width, depth, height), mats["plaster"], bevel=0.09)
    box(house, name + "_roof", (0, 0, height + 0.20), (width + 0.55, depth + 0.55, 0.38), mats[roof], bevel=0.07)
    box(house, name + "_door", (0, -depth * 0.515, 0.95), (0.90, 0.13, 1.72), mats["wood"], bevel=0.04)
    window_z = min(height - 0.65, 1.65)
    for side in (-1, 1):
        box(house, f"{name}_window_{side}", (side * width * 0.27, -depth * 0.52, window_z), (0.68, 0.12, 0.82), mats["teal_dark"], bevel=0.035)
    if height > 4.4:
        box(house, name + "_balcony", (0, -depth * 0.64, 3.0), (width * 0.72, 0.76, 0.18), mats["stone_light"], bevel=0.035)
        box(house, name + "_balcony_rail", (0, -depth * 0.96, 3.45), (width * 0.74, 0.08, 0.78), mats["teal_dark"], bevel=0.02)
    return house


def create_reference_temple(name, x, y, base_z, target, mats, scale=1.0):
    temple = root(name, target, (x, y, base_z))
    box(temple, name + "_plinth", (0, 0, 0.35 * scale), (5.8 * scale, 5.4 * scale, 0.70 * scale), mats["stone_light"], bevel=0.10)
    box(temple, name + "_hall", (0, 0, 2.0 * scale), (4.3 * scale, 4.0 * scale, 3.3 * scale), mats["plaster"], bevel=0.08)
    for side in (-1, 1):
        box(temple, f"{name}_column_{side}", (side * 1.45 * scale, -2.15 * scale, 2.10 * scale), (0.38 * scale, 0.38 * scale, 3.6 * scale), mats["plaster"], bevel=0.04)
    for level, (z, size) in enumerate(((3.85, 5.0), (4.35, 4.0), (4.82, 3.0), (5.25, 2.1))):
        box(temple, f"{name}_roof_{level}", (0, 0, z * scale), (size * scale, size * 0.78 * scale, 0.34 * scale), mats["yellow" if level % 2 == 0 else "orange"], bevel=0.08)
    cone(temple, name + "_finial", (0, 0, 5.95 * scale), 0.32 * scale, 1.05 * scale, mats["yellow"], vertices=7)
    return temple


def create_reference_water_system(target, mats):
    water = root("CENTRAL_WATER_SYSTEM", target)
    lake = root("HIDDEN_HILLSIDE_LAKE", target, (-4.0, 78.0, 2.06))
    lake.parent = water
    sphere(lake, "Lake_water", (0, 0, 0.14), (20.5, 14.8, 0.32), mats["water"], 3)
    sphere(lake, "Lake_inner_glow", (-1.5, -0.8, 0.35), (15.8, 10.8, 0.12), mats["water_light"], 2)
    for index in range(28):
        angle = index / 28 * math.tau
        radius_x = 21.0 + random.uniform(-0.7, 0.7)
        radius_y = 15.2 + random.uniform(-0.5, 0.5)
        sphere(lake, f"Lake_edge_rock_{index}", (math.cos(angle) * radius_x, math.sin(angle) * radius_y, 0.15), (random.uniform(0.65, 1.25), random.uniform(0.50, 0.95), random.uniform(0.38, 0.72)), mats["stone_mid"], 1)

    # Temple island and bridge are intentionally separate walkable meshes.
    island = cylinder(water, "Lake_temple_island", (5.5, 78.5, 2.38), 5.1, 0.48, mats["stone_light"], vertices=20)
    island.scale.y = 0.78
    bridge_points = [(-23.5, 75.0, 2.42), (-16.0, 75.8, 2.48), (-8.0, 77.0, 2.50), (1.5, 78.2, 2.52)]
    bridge = create_ribbon_3d("LAKESIDE_STONE_BRIDGE", bridge_points, [3.0] * len(bridge_points), mats["stone_light"], target)
    bridge.parent = water
    for index in range(11):
        t = index / 10
        x = -23.0 + 24.0 * t
        y = 75.0 + 3.2 * t
        box(water, f"Lake_bridge_parapet_left_{index}", (x, y + 1.55, 3.05), (0.26, 0.32, 1.05), mats["stone_mid"], bevel=0.04)
        box(water, f"Lake_bridge_parapet_right_{index}", (x, y - 1.55, 3.05), (0.26, 0.32, 1.05), mats["stone_mid"], bevel=0.04)

    river_points = [(12, 66, 2.22), (19, 55, 2.04), (23, 44, 1.35), (26, 32, 0.76), (23, 20, 0.34), (31, 8, 0.12), (37, -4, -0.05)]
    river = create_ribbon_3d("Central_river", river_points, [5.8, 5.1, 4.6, 4.0, 3.6, 3.2, 3.0], mats["water"], target)
    river.parent = water
    foam = create_ribbon_3d("Central_river_foam", [(x - 0.4, y, z + 0.08) for x, y, z in river_points], [0.55] * len(river_points), mats["water_light"], target)
    foam.parent = water

    # Twin falls descend from the high railway plateau into the lake basin.
    falls = root("REFERENCE_WATERFALL", target, (-3.0, 117.0, 2.25))
    falls.parent = water
    for side in (-1, 1):
        for index, (z, sx, sy, sz) in enumerate(((1.0, 3.0, 2.0, 2.3), (3.6, 3.5, 2.1, 2.8), (6.4, 3.9, 2.3, 3.2))):
            sphere(falls, f"Waterfall_rock_{side}_{index}", (side * 2.7, 0.5, z), (sx, sy, sz), mats["stone_dark" if index % 2 else "stone_mid"], 2)
        sheet_x = side * 1.25
        vertices = [(sheet_x - 0.75, -1.65, 8.8), (sheet_x + 0.75, -1.65, 8.8), (sheet_x + 0.55, -1.7, 0.0), (sheet_x - 0.55, -1.7, 0.0)]
        sheet = mesh_object(f"Waterfall_sheet_{side}", vertices, [(0, 1, 2, 3)], mats["water"], target)
        sheet.parent = falls
    sphere(falls, "Waterfall_pool", (0, -2.0, -0.20), (5.8, 3.2, 0.32), mats["water"], 2)
    create_ribbon_3d("WATERFALL_DISCOVERY_TRAIL", [(-18, 100, 2.45), (-13, 108, 3.05), (-10, 116, 3.70), (-8, 124, 4.75)], [2.8, 2.6, 2.5, 2.4], mats["stone"], target)
    return water


def create_reference_terraces(target, mats):
    terraces = root("TERRACED_LANDSCAPE", target)
    specs = (
        (-42, 30, 0.30, 8.4, 6.2, 6), (-45, 68, 2.06, 8.2, 6.3, 6),
        (-48, 78, 2.06, 10.0, 6.8, 6), (-43, 103, 2.12, 10.8, 7.4, 6),
        (-32, 124, 3.10, 9.4, 6.4, 5), (31, 108, 2.12, 10.8, 7.0, 6),
        (42, 88, 2.08, 9.0, 6.2, 5), (39, 127, 4.20, 9.4, 6.6, 5),
    )
    for index, spec in enumerate(specs):
        create_terraced_hill(terraces, f"Terrace_field_{index}", *spec, mats)
    return terraces


def create_reference_landforms(target, mats):
    """Give the island the steep, nested Himalayan silhouette in the concept."""
    landforms = root("HIMALAYAN_LANDFORMS", target)

    # Low mounds sit beneath the rice terraces so they read as carved hills,
    # not flat discs. Their tops stay away from every protected route.
    mound_specs = (
        (-39, 33, -0.25, 7.8, 6.0, 2.2), (-45, 78, 1.45, 7.8, 9.2, 3.0),
        (-42, 111, 1.85, 9.0, 9.5, 3.2), (39, 111, 1.85, 10.0, 11.0, 3.6),
        (41, 88, 1.45, 8.0, 8.0, 2.7), (-31, 126, 2.75, 6.6, 6.5, 2.7),
    )
    for index, (x, y, z, sx, sy, sz) in enumerate(mound_specs):
        sphere(landforms, f"Landscape_mound_{index}_stone", (x, y, z), (sx, sy, sz), mats["stone_mid"], 2)
        sphere(landforms, f"Landscape_mound_{index}_grass", (x, y, z + sz * 0.34), (sx * 0.94, sy * 0.94, sz * 0.72), mats["grass_light"], 2)

    # Narrow gorge walls make the outflow and railway side feel carved rather
    # than painted onto the ground.
    for index, (x, y, z, sx, sy, sz) in enumerate((
        (34, 23, -1.2, 5.2, 7.0, 4.8), (35, 36, -0.2, 5.8, 8.0, 5.0),
        (48, 95, 0.4, 3.8, 8.5, 5.2), (46, 118, 1.8, 3.8, 8.5, 6.0),
    )):
        sphere(landforms, f"Gorge_bank_{index}", (x, y, z), (sx, sy, sz), mats["stone_dark"], 2)
    return landforms


def create_true_himalayan_range(target, mats):
    """Actual world-space mountain meshes, not a billboard or camera card."""
    mountains = root("TRUE_3D_HIMALAYAN_RANGE", target)
    peak_specs = (
        (-92, 193, -13, 22, 18, 41), (-67, 209, -13, 27, 20, 55),
        (-35, 219, -13, 31, 22, 64), (0, 224, -13, 34, 24, 72),
        (37, 220, -13, 30, 22, 63), (69, 208, -13, 27, 20, 54),
        (95, 191, -13, 22, 18, 40),
    )
    for index, (x, y, base_z, radius_x, radius_y, height) in enumerate(peak_specs):
        bpy.ops.mesh.primitive_cone_add(vertices=9, radius1=1.0, radius2=0.055, depth=1.0)
        peak = bpy.context.object
        peak.name = f"True_mountain_peak_{index}"
        peak.parent = mountains
        move_to_collection(peak, target)
        peak.location = (x, y, base_z + height * 0.5)
        peak.scale = (radius_x, radius_y, height)
        peak.rotation_euler.z = (index % 3 - 1) * 0.12
        peak.data.materials.append(mats["mountain" if index % 2 else "mountain_far"])

        # A second offset stone facet breaks the perfect cone silhouette.
        bpy.ops.mesh.primitive_cone_add(vertices=7, radius1=1.0, radius2=0.10, depth=1.0)
        shoulder = bpy.context.object
        shoulder.name = f"True_mountain_shoulder_{index}"
        shoulder.parent = mountains
        move_to_collection(shoulder, target)
        shoulder.location = (x + radius_x * 0.42 * (-1 if index % 2 else 1), y - 1.5, base_z + height * 0.30)
        shoulder.scale = (radius_x * 0.62, radius_y * 0.70, height * 0.58)
        shoulder.rotation_euler.z = -0.18 if index % 2 else 0.16
        shoulder.data.materials.append(mats["mountain"])

        bpy.ops.mesh.primitive_cone_add(vertices=9, radius1=1.0, radius2=0.02, depth=1.0)
        cap = bpy.context.object
        cap.name = f"True_mountain_snow_{index}"
        cap.parent = mountains
        move_to_collection(cap, target)
        snow_height = height * 0.34
        cap.location = (x, y - 0.10, base_z + height - snow_height * 0.48)
        cap.scale = (radius_x * 0.37, radius_y * 0.37, snow_height)
        cap.rotation_euler.z = peak.rotation_euler.z
        cap.data.materials.append(mats["snow"])
    return mountains


def create_reference_hamlets(target, mats):
    """Small background homes provide the dense village texture of the map."""
    hamlets = root("HILLSIDE_HAMLETS", target)
    candidates = (
        (-51, -17), (-37, -18), (-8, -19), (8, -18), (44, -14),
        (-50, 34), (-35, 35), (20, 32), (38, 36), (49, 42),
        (-52, 63), (-42, 61), (16, 63), (48, 61), (-50, 84),
        (-40, 84), (19, 113), (46, 115), (-48, 120), (-34, 118),
        (-36, 150), (-25, 157), (31, 155), (43, 158), (-35, 178),
        (33, 179),
    )
    built = 0
    for index, (x, y) in enumerate(candidates):
        if not clears_protected_routes(x, y, 2.4):
            continue
        if (Vector((x, y)) - Vector((-4, 78))).length < 24:
            continue
        base_z = 0.08 if y < 43 else 2.10 if y < 130 else 7.10
        house = create_reference_house(
            f"Hamlet_building_{index}", x, y, base_z,
            3.8 + (index % 3) * 0.45, 3.2 + (index % 2) * 0.35,
            3.2 + (index % 4) * 0.35, target, mats,
            "teal" if index % 2 else "teal_dark", (-0.08 + (index % 4) * 0.05),
        )
        house.parent = hamlets
        built += 1
    hamlets["building_count"] = built
    return hamlets


def create_reference_map_details(target, mats):
    details = root("REFERENCE_MAP_DETAILS", target)
    flags = root("PRAYER_FLAG_NETWORK", target)
    flag_lines = (
        ((-48, 28, 4.2), (-22, 30, 4.8)), ((-17, 19, 4.7), (18, 18, 5.0)),
        ((-27, 106, 6.0), (8, 111, 7.2)), ((-20, 175, 12.3), (28, 174, 12.0)),
    )
    colors = ("yellow", "orange", "red", "teal", "pink")
    for line_index, (start, end) in enumerate(flag_lines):
        curve_object(f"Prayer_flag_rope_{line_index}", (start, end), mats["ink"], target, 0.025)
        a, b = Vector(start), Vector(end)
        for flag_index in range(11):
            p = a.lerp(b, (flag_index + 0.5) / 11)
            vertices = ((p.x - 0.34, p.y, p.z), (p.x + 0.34, p.y, p.z), (p.x, p.y, p.z - 0.78))
            mesh = mesh_object(f"Prayer_flag_{line_index}_{flag_index}", vertices, ((0, 1, 2),), mats[colors[(line_index + flag_index) % len(colors)]], target)
            mesh.parent = flags

    # Clouds around the cliff base hide the edge of the play space in the same
    # way the concept art uses turquoise atmospheric haze.
    clouds = root("ISLAND_CLOUD_RING", target)
    for index in range(24):
        angle = index / 24 * math.tau
        x = math.cos(angle) * (86 + (index % 3) * 4)
        y = 76 + math.sin(angle) * (126 + (index % 4) * 3)
        sphere(clouds, f"Island_mist_cloud_{index}", (x, y, -7.5 + (index % 2)), (9.0 + index % 4, 6.5 + index % 3, 3.0), mats["cloud"], 2)
    return details


def create_reference_cities(target, mats):
    lower = root("CITY_1_NAMASTE_BAZAAR", target)
    middle = root("CITY_2_JHEEL_MANDIR", target)
    upper = root("CITY_3_PAHADI_RAIL", target)

    lower_specs = (
        (-45, -12, 5.8, 4.8, 4.3, "teal", 0.06), (-24.0, -8, 6.2, 4.4, 5.0, "teal_dark", -0.05),
        (-18, -14, 5.1, 4.2, 3.8, "teal", 0.04), (-38, 13, 5.8, 4.5, 4.6, "teal_dark", -0.05),
        (-28, 16, 6.3, 4.8, 5.2, "teal", 0.04), (-18, 19, 5.0, 4.1, 4.1, "teal_dark", -0.06),
        (18, -14, 5.8, 4.5, 4.7, "teal", -0.05), (28, -12, 6.1, 4.8, 5.4, "teal_dark", 0.04),
        (36, 26, 5.5, 4.3, 4.2, "teal", -0.06), (20, 14, 5.2, 4.2, 4.3, "teal_dark", 0.05),
        (31, 15, 6.4, 4.8, 5.0, "teal", -0.04), (42, 20, 5.2, 4.2, 4.0, "teal_dark", 0.06),
    )
    for index, (x, y, w, d, h, roof, rot) in enumerate(lower_specs):
        house = create_reference_house(f"Bazaar_building_{index}", x, y, 0.08, w, d, h, target, mats, roof, rot)
        house.parent = lower
    create_reference_temple("Bazaar_clock_temple", -45, 25, 0.10, target, mats, 0.92).parent = lower
    gate = create_city_gate("Namaste_Bazaar_gate", (path_center(25), 25), 13.0, target, mats, "yellow")
    gate.scale.z = 1.35
    gate.parent = lower
    for name, x, y, accent, rotation in (
        ("Bazaar_fruit_stall", -14, 8, "orange", 0.0), ("Bazaar_spice_stall", 13.5, 10, "yellow", math.pi),
        ("Bazaar_textile_stall", -13, -5, "teal", 0.0), ("Bazaar_snack_stall", 13, -3, "orange", math.pi),
    ):
        stall = create_market_stall(name, x, y, target, mats, accent, rotation)
        stall.parent = lower
    box(lower, "Bazaar_square", (0, 5, 0.09), (26, 22, 0.16), mats["stone_light"], bevel=0.30)
    box(lower, "Bazaar_notice_board", (-12, 22, 1.35), (2.4, 0.22, 1.65), mats["teal_dark"], bevel=0.07)

    middle_specs = (
        (23, 67, 5.4, 4.2, 4.4, "teal", 0.05), (33, 65, 5.8, 4.5, 5.0, "teal_dark", -0.06),
        (43, 69, 5.1, 4.1, 4.0, "teal", 0.04), (24, 82, 5.2, 4.0, 4.2, "teal_dark", -0.04),
        (36, 82, 6.0, 4.6, 5.5, "teal", 0.05), (46, 87, 5.0, 4.0, 4.0, "teal_dark", -0.03),
        (22, 97, 5.8, 4.5, 4.8, "teal", 0.04), (34, 99, 6.1, 4.7, 5.3, "teal_dark", -0.05),
        (45, 104, 5.2, 4.1, 4.1, "teal", 0.05), (-48, 68, 5.0, 4.0, 4.0, "teal", -0.04),
        (-48, 93, 5.4, 4.2, 4.4, "teal_dark", 0.05), (-39, 112, 5.1, 4.0, 4.0, "teal", -0.05),
    )
    for index, (x, y, w, d, h, roof, rot) in enumerate(middle_specs):
        house = create_reference_house(f"Lake_building_{index}", x, y, 2.12, w, d, h, target, mats, roof, rot)
        house.parent = middle
    create_reference_temple("Jheel_island_temple", 5.5, 78.5, 2.62, target, mats, 1.04).parent = middle
    gate = create_city_gate("Jheel_Mandir_gate", (path_center(104), 104), 10.0, target, mats, "orange")
    gate.location.z = 2.25
    gate.scale.z = 1.35
    gate.parent = middle
    stall = create_market_stall("Mandir_flower_stall", 19.0, 88.0, target, mats, "orange", math.pi / 2)
    stall.location.z = 2.10
    stall.parent = middle
    box(middle, "Jheel_city_map", (18, 103, 3.55), (2.6, 0.22, 1.8), mats["teal"], bevel=0.08)

    upper_specs = (
        (-34, 136, 5.6, 4.3, 4.6, "teal", 0.04), (-22, 136, 5.9, 4.5, 5.1, "teal_dark", -0.05),
        (-15, 136, 5.2, 4.2, 4.1, "teal", 0.04), (20, 136, 5.8, 4.4, 4.8, "teal_dark", -0.05),
        (33, 135, 6.0, 4.6, 5.3, "teal", 0.05), (43, 132, 5.2, 4.1, 4.0, "teal_dark", -0.04),
        (-40, 174, 5.4, 4.2, 4.3, "teal_dark", 0.04), (-18, 167, 5.8, 4.4, 4.8, "teal", -0.05),
        (-10, 166, 6.0, 4.6, 5.4, "teal_dark", 0.04), (-42, 130, 5.8, 4.4, 4.7, "teal", -0.04),
        (44, 174, 5.3, 4.1, 4.2, "teal_dark", 0.05),
    )
    for index, (x, y, w, d, h, roof, rot) in enumerate(upper_specs):
        house = create_reference_house(f"Rail_building_{index}", x, y, 7.12, w, d, h, target, mats, roof, rot)
        house.parent = upper
    station = root("PAHADI_RAIL_STATION", target, (15.0, 165.0, 7.08))
    station.parent = upper
    box(station, "Station_platform", (0, -3.8, 0.42), (24.0, 4.2, 0.72), mats["stone_light"], bevel=0.12)
    box(station, "Station_hall", (0, 0, 2.7), (13.5, 6.0, 5.4), mats["plaster"], bevel=0.11)
    box(station, "Station_roof", (0, 0, 5.72), (15.0, 7.2, 0.46), mats["teal_dark"], bevel=0.10)
    for index, x in enumerate((-5.0, -2.5, 0.0, 2.5, 5.0)):
        box(station, f"Station_window_{index}", (x, -3.04, 3.0), (1.25, 0.12, 1.35), mats["water_dark"], bevel=0.04)
    box(station, "Station_sign", (0, -3.20, 4.80), (7.0, 0.16, 1.0), mats["yellow"], bevel=0.06)
    create_reference_temple("Pahadi_rail_temple", 15, 185, 7.12, target, mats, 0.86).parent = upper
    gate = create_city_gate("Pahadi_Rail_gate", (path_center(140), 140), 11.0, target, mats, "yellow")
    gate.location.z = 7.05
    gate.scale.z = 1.35
    gate.parent = upper
    stall = create_market_stall("Rail_city_snack_stall", 18, 137, target, mats, "orange", 0.0)
    stall.location.z = 7.05
    stall.parent = upper
    box(upper, "Rail_city_timetable", (22, 169, 8.65), (2.9, 0.24, 1.9), mats["yellow"], bevel=0.08)
    return lower, middle, upper


def create_reference_vegetation(target, mats):
    tree_specs = []
    for side in (-1, 1):
        for index, y in enumerate(range(-15, 171, 13)):
            x = side * (43 + (index % 3) * 3)
            z = 0.02 if y < 45 else 2.05 if y < 130 else 7.05
            tree_specs.append((x, y, z, 0.78 + (index % 4) * 0.08, y > 100))
    tree_specs.extend((
        (-35, 34, 1.0, 0.90, False), (-25, 40, 1.6, 0.82, False), (26, 35, 0.9, 0.86, False),
        (-30, 93, 2.05, 0.78, False), (15, 108, 2.30, 0.84, True), (32, 116, 2.30, 0.90, True),
        (-37, 147, 7.05, 0.92, True), (-20, 157, 7.05, 0.86, True), (39, 150, 7.05, 0.94, True),
        (1, 119, 3.5, 0.88, True), (11, 127, 5.4, 0.90, True),
    ))
    # Fill the quiet slopes with a forest, while keeping the authored roads,
    # footpath, lake edge, and building fronts completely clear.
    occupied = []
    for obj in target.objects:
        if obj.type == "EMPTY" and obj.name.startswith(("Bazaar_building_", "Lake_building_", "Rail_building_", "Hamlet_building_")):
            occupied.append(Vector((obj.location.x, obj.location.y)))
    attempts = 0
    while len(tree_specs) < 158 and attempts < 720:
        attempts += 1
        y = random.uniform(-20, 178)
        half_width = 53 if y < 130 else 45
        x = random.uniform(-half_width, half_width)
        if not clears_protected_routes(x, y, 1.45):
            continue
        if (Vector((x, y)) - Vector((-4, 78))).length < 24.5:
            continue
        if any((Vector((x, y)) - point).length < 4.2 for point in occupied):
            continue
        z = 0.02 if y < 43 else 2.05 if y < 130 else 7.05
        tree_specs.append((x, y, z, random.uniform(0.68, 1.04), y > 105 or random.random() < 0.32))
    for index, (x, y, z, scale, conifer) in enumerate(tree_specs):
        if not clears_protected_routes(x, y, 1.85 * scale):
            continue
        tree = create_tree(f"Island_tree_{index}", x, y, scale, target, mats, conifer)
        tree.location.z = z

    # Pink flowering trees punctuate the green terraces as in the concept.
    blossom_root = root("HIMALAYAN_BLOSSOM_TREES", target)
    for index, (x, y, z) in enumerate(((-34, 61, 2.1), (-42, 118, 3.0), (27, 91, 2.1), (42, 119, 3.4), (-40, 125, 3.2))):
        if not clears_protected_routes(x, y, 2.0):
            continue
        cylinder(blossom_root, f"Blossom_trunk_{index}", (x, y, z + 1.3), 0.18, 2.6, mats["wood"], vertices=8)
        for petal in range(4):
            angle = petal / 4 * math.tau
            sphere(blossom_root, f"Blossom_crown_{index}_{petal}", (x + math.cos(angle) * 0.75, y + math.sin(angle) * 0.55, z + 2.9 + (petal % 2) * 0.35), (1.05, 0.85, 1.05), mats["pink" if index % 2 else "red"], 2)


def create_player(target, mats):
    player = root("PLAYER_RIG", target, (-7.5, -22.0, 0.14), rotation=(0, 0, 0))
    player.scale = (1.45, 1.45, 1.45)
    sphere(player, "Player_torso", (0, 0, 1.43), (0.47, 0.34, 0.61), mats["shirt"], 2, True)
    sphere(player, "Player_pants", (0, 0, 0.91), (0.41, 0.33, 0.40), mats["pants"], 2, True)
    cylinder(player, "Player_neck", (0, 0, 1.94), 0.115, 0.22, mats["skin"], vertices=10)
    sphere(player, "Player_head", (0, 0, 2.24), (0.34, 0.31, 0.39), mats["skin"], 3, True)
    sphere(player, "Player_hair_cap", (0, 0.01, 2.49), (0.37, 0.32, 0.28), mats["hair"], 2, True)
    sphere(player, "Player_hair_back", (0, -0.24, 2.38), (0.31, 0.10, 0.23), mats["hair"], 2, True)
    for index, (hx, hy, hz, tilt) in enumerate(((-0.26, 0.03, 2.75, -0.30), (-0.14, 0.07, 2.80, -0.17), (0.0, 0.08, 2.84, 0.0), (0.14, 0.06, 2.80, 0.18), (0.27, 0.02, 2.73, 0.32))):
        cone(player, f"Player_hair_spike_{index}", (hx, hy, hz), 0.105, 0.36, mats["hair"], rotation=(tilt * 0.45, tilt, 0), vertices=7)
    for side in (-1, 1):
        sphere(player, f"Player_ear_{side}", (side * 0.33, 0, 2.24), (0.08, 0.055, 0.13), mats["skin"], 2, True)
        sphere(player, f"Player_eye_white_{side}", (side * 0.13, 0.286, 2.31), (0.115, 0.052, 0.135), mats["eye_white"], 2, True)
        sphere(player, f"Player_eye_iris_{side}", (side * 0.13, 0.333, 2.30), (0.055, 0.025, 0.070), mats["eye_brown"], 2, True)
        # Arms and legs use real shoulder/hip pivots.  Three.js animates these
        # empties, so hands and shoes travel with the limb instead of rotating
        # awkwardly around each mesh's centre.
        arm = root(f"Player_arm_{side}", target, (side * 0.47, 0, 1.58))
        arm.parent = player
        sphere(arm, f"Player_sleeve_{side}", (0, 0, -0.04), (0.18, 0.20, 0.25), mats["shirt"], 2, True)
        cylinder(arm, f"Player_arm_mesh_{side}", (0, 0, -0.31), 0.09, 0.48, mats["skin"], vertices=10)
        sphere(arm, f"Player_hand_{side}", (0, 0, -0.60), (0.105, 0.09, 0.13), mats["skin"], 2, True)

        leg = root(f"Player_leg_{side}", target, (side * 0.20, 0, 0.82))
        leg.parent = player
        cylinder(leg, f"Player_leg_mesh_{side}", (0, 0, -0.35), 0.13, 0.74, mats["pants"], vertices=10)
        box(leg, f"Player_shoe_{side}", (0, -0.12, -0.75), (0.34, 0.52, 0.22), mats["yellow"], bevel=0.07)
    box(player, "Player_shirt_placket", (0, 0.319, 1.48), (0.055, 0.035, 0.53), mats["plaster"], bevel=0.015)
    return player


def validate_main_walking_path(target):
    """Fail the build if scenery intrudes into protected walking or road lanes."""
    ignored_roots = {
        "PLAYER_RIG", "Exact_ground", "INDIA_VEHICLE_ROAD_NETWORK", "Exact_sky",
        "TRAIN_ROUTE_WAYPOINTS", "ROAD_ROUTE_WAYPOINTS", "DRIVABLE_VEHICLES", "TOY_TRAIN",
    }
    ignored_prefixes = (
        "Main_cobblestone_path", "Cobble_", "Cobblestone_field", "Grass_bank_",
        "Ground_mass", "Middle_hills_ground", "Upper_valley_ground", "Upper_valley_square", "Rail_ravine_",
        "Island_mist_sea", "Island_perimeter_cliffs", "Island_cliff_rock_",
        "Upper_square_stone_", "Upper_square_stones",
        "VEHICLE_ROAD_", "LOWER_CITY_ROAD", "MIDDLE_CITY_ROAD", "UPPER_CITY_ROAD",
        "Road_markings", "Pedestrian_crossing_", "Railway_trail_", "RAILWAY_WALKING_TRAIL",
        "LAKESIDE_DISCOVERY_TRAIL", "LAKESIDE_STONE_BRIDGE", "WATERFALL_DISCOVERY_TRAIL", "Bridge_deck",
        "Lake_temple_island", "Bazaar_square", "Station_platform",
        "Halt_platform", "Rail_track_bed", "Track_", "Rail_sleeper_", "Painted_cloud_",
        "Far_mountain_", "Snow_peak_", "Sky_card", "Waterfall_stream", "Waterfall_foam",
        "Waterfall_glint_", "Waterfall_sheet_", "Viaduct_deck", "Viaduct_arch_",
        "Central_river", "Central_river_foam",
    )

    def sample_route(points, half_width, cyclic=False):
        samples = []
        segments = list(zip(points, points[1:]))
        if cyclic:
            segments.append((points[-1], points[0]))
        for a_values, b_values in segments:
            a = Vector(a_values)
            b = Vector(b_values)
            delta = b - a
            planar_delta = Vector((delta.x, delta.y))
            tangent = planar_delta.normalized()
            side = Vector((-tangent.y, tangent.x))
            steps = max(2, int(planar_delta.length / 0.75))
            for step in range(steps + 1):
                center = a.lerp(b, step / steps)
                width = half_width(center.y) if callable(half_width) else half_width
                lateral_count = max(2, int(width / 0.70))
                for lateral in range(-lateral_count, lateral_count + 1):
                    offset = lateral / lateral_count * width
                    samples.append((center.x + side.x * offset, center.y + side.y * offset, center.z))
        return samples

    walking_samples = sample_route(MAIN_PATH_3D, lambda y: max(1.3, path_width(y) * 0.5 - 0.55))
    road_samples = sample_route(VEHICLE_ROAD_LOOP_3D, 3.25, cyclic=True)
    for _, points in CITY_ROAD_BRANCHES_3D:
        road_samples.extend(sample_route(points, 3.05))

    def overlaps_samples(bounds, samples, padding, clearance_height):
        min_x, max_x, min_y, max_y, min_z, max_z = bounds
        for x, y, z in samples:
            if min_z < z + clearance_height and max_z > z + 0.18:
                if min_x - padding < x < max_x + padding and min_y - padding < y < max_y + padding:
                    return True
        return False

    walking_overlaps = set()
    road_overlaps = set()
    checked_meshes = 0
    bpy.context.view_layer.update()
    for obj in target.all_objects:
        if obj.type != "MESH" or obj.name.startswith(ignored_prefixes):
            continue
        ancestors = set()
        parent = obj.parent
        while parent:
            ancestors.add(parent.name)
            parent = parent.parent
        if ancestors & ignored_roots:
            continue
        corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
        bounds = (
            min(p.x for p in corners), max(p.x for p in corners),
            min(p.y for p in corners), max(p.y for p in corners),
            min(p.z for p in corners), max(p.z for p in corners),
        )
        checked_meshes += 1
        if overlaps_samples(bounds, walking_samples, 0.42, 3.0):
            walking_overlaps.add(obj.name)
        if overlaps_samples(bounds, road_samples, 0.28, 3.2):
            road_overlaps.add(obj.name)

    all_overlaps = sorted(walking_overlaps | road_overlaps)
    report = {
        "walking_samples": len(walking_samples),
        "road_samples": len(road_samples),
        "checked_meshes": checked_meshes,
        "walking_overlaps": sorted(walking_overlaps),
        "road_overlaps": sorted(road_overlaps),
        "overlaps": all_overlaps,
        "clear": not all_overlaps,
    }
    with open(LAYOUT_REPORT_PATH, "w", encoding="utf-8") as report_file:
        json.dump(report, report_file, indent=2)
    if all_overlaps:
        raise RuntimeError("Protected route blocked by: " + ", ".join(all_overlaps[:30]))
    print("NIMBU ROUTES CLEAR", len(walking_samples), "walking samples", len(road_samples), "road samples", checked_meshes, "blocking meshes checked")


def configure_render():
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except Exception:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1672
    scene.render.resolution_y = 941
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world = scene.world or bpy.data.worlds.new("Exact hilltown sky")
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = PALETTE["sky"]
    background.inputs["Strength"].default_value = 0.62
    scene.render.use_freestyle = True
    scene.render.line_thickness = 1.45
    lineset = bpy.context.view_layer.freestyle_settings.linesets[0]
    lineset.select_silhouette = True
    lineset.select_border = True
    lineset.select_crease = False
    lineset.select_external_contour = True
    lineset.select_material_boundary = True
    linestyle = lineset.linestyle
    linestyle.color = PALETTE["ink"][:3]
    linestyle.thickness = 1.45
    linestyle.alpha = 0.94
    try:
        scene.view_settings.view_transform = "Standard"
        scene.view_settings.look = "Medium High Contrast"
    except Exception:
        pass


def build():
    clear_scene()
    mats = {name: material("Exact_" + name, color) for name, color in PALETTE.items()}
    # Keep distant painted forms saturated instead of letting scene lighting
    # muddy them; foreground objects still receive full toon light/shadow.
    for name in ("sky", "cloud", "mountain", "mountain_far", "snow"):
        bsdf = mats[name].node_tree.nodes.get("Principled BSDF")
        emission = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
        strength = bsdf.inputs.get("Emission Strength")
        if emission:
            emission.default_value = PALETTE[name]
        if strength:
            strength.default_value = 0.35
    export = make_collection("EXPORT_EXACT_HILLTOWN")
    create_sky_and_mountains(export, mats)
    create_reference_island(export, mats)
    create_reference_road_network(export, mats)
    create_reference_landforms(export, mats)
    create_reference_terraces(export, mats)
    create_reference_water_system(export, mats)
    create_reference_cities(export, mats)
    create_reference_hamlets(export, mats)
    create_chai_stall(export, mats)
    create_railway_and_train(export, mats)
    create_reference_vegetation(export, mats)
    create_reference_map_details(export, mats)
    create_drivable_vehicles(export, mats)

    create_player(export, mats)
    validate_main_walking_path(export)
    optimize_web_scene(export)
    configure_render()

    bpy.ops.object.light_add(type="SUN", location=(-14, -18, 28))
    sun = bpy.context.object
    sun.name = "Reference_sun"
    sun.data.energy = 1.75
    sun.data.color = (1.0, 0.82, 0.60)
    sun.data.angle = math.radians(7)
    sun.rotation_euler = (math.radians(34), math.radians(-22), math.radians(-38))
    bpy.ops.object.light_add(type="AREA", location=(11, -13, 22))
    fill = bpy.context.object
    fill.name = "Reference_fill"
    fill.data.energy = 260
    fill.data.shape = "DISK"
    fill.data.size = 18
    point_at(fill, (0, 4, 1))

    bpy.ops.object.camera_add(location=(-7.5, -43.0, 13.8))
    camera = bpy.context.object
    camera.name = "EXACT_REFERENCE_CAMERA"
    camera.data.lens = 55
    camera.data.sensor_width = 36
    camera.data.clip_start = 0.10
    camera.data.clip_end = 320.0
    point_at(camera, (-5.0, -13.0, 2.8))
    camera.data.show_background_images = True
    if os.path.exists(REFERENCE_PATH):
        image = bpy.data.images.load(REFERENCE_PATH, check_existing=True)
        background = camera.data.background_images.new()
        background.image = image
        background.alpha = 0.42
        background.display_depth = "BACK"
        background.frame_method = "FIT"
    bpy.context.scene.camera = camera
    bpy.context.scene.render.filepath = RENDER_PATH
    bpy.ops.render.render(write_still=True)

    # Separate verification render: shows true map scale without changing the
    # close third-person gameplay composition.
    bpy.ops.object.camera_add(location=(150.0, -205.0, 152.0))
    overview = bpy.context.object
    overview.name = "EXPLORATION_MAP_OVERVIEW_CAMERA"
    overview.data.type = "ORTHO"
    overview.data.ortho_scale = 232
    overview.data.clip_end = 420.0
    point_at(overview, (0.0, 78.0, 2.5))
    # The painted third-person horizon is useful in game but its rectangular
    # card should not appear in the GTA-like map overview.
    sky_root = bpy.data.objects.get("Exact_sky")
    if sky_root:
        sky_root.hide_render = True
    bpy.context.scene.camera = overview
    bpy.context.scene.render.filepath = OVERVIEW_RENDER_PATH
    bpy.ops.render.render(write_still=True)
    if sky_root:
        sky_root.hide_render = False
    bpy.context.scene.camera = camera
    bpy.context.scene.render.filepath = RENDER_PATH
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
        export_apply=True,
    )
    bpy.ops.object.select_all(action="DESELECT")
    print("NIMBU EXACT HILLTOWN COMPLETE", BLEND_PATH, GLB_PATH)


if __name__ == "__main__":
    build()
