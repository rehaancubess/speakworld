import bpy
import math
import os
from mathutils import Vector


ROOT = "/Users/rehaanr/Documents/openai"
BLEND_PATH = os.path.join(ROOT, "blender", "nimbu_style_slice_master.blend")
RENDER_PATH = os.path.join(ROOT, "blender", "output", "nimbu_style_slice.png")
GLB_PATH = os.path.join(ROOT, "public", "assets", "nimbu_style_slice.glb")

PALETTE = {
    "sky": (0.27, 0.66, 0.66, 1),
    "cloud": (0.54, 0.85, 0.79, 1),
    "grass": (0.19, 0.52, 0.31, 1),
    "grass_light": (0.27, 0.63, 0.38, 1),
    "grass_dark": (0.07, 0.32, 0.18, 1),
    "rock": (0.67, 0.63, 0.50, 1),
    "rock_shadow": (0.43, 0.45, 0.38, 1),
    "paper": (0.81, 0.82, 0.73, 1),
    "paper_shadow": (0.58, 0.60, 0.53, 1),
    "path": (0.58, 0.52, 0.40, 1),
    "wood": (0.64, 0.58, 0.45, 1),
    "water": (0.36, 0.80, 0.78, 1),
    "water_dark": (0.11, 0.45, 0.51, 1),
    "ink": (0.015, 0.025, 0.03, 1),
    "shirt": (0.05, 0.52, 0.59, 1),
    "pants": (0.05, 0.20, 0.27, 1),
    "skin": (0.71, 0.47, 0.39, 1),
    "hair": (0.15, 0.13, 0.19, 1),
    "eye_white": (0.96, 0.95, 0.88, 1),
    "eye_brown": (0.13, 0.07, 0.035, 1),
    "smile": (0.31, 0.08, 0.06, 1),
    "yellow": (0.91, 0.56, 0.10, 1),
    "orange": (0.77, 0.31, 0.15, 1),
}


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        if collection.name != "Collection" and collection.users == 0:
            bpy.data.collections.remove(collection)


def material(name, color):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = 0.91
    return mat


def make_collection(name):
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    return collection


def move_to_collection(obj, target):
    for source in list(obj.users_collection):
        source.objects.unlink(obj)
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
        modifier = obj.modifiers.new("Soft illustrated edge", "BEVEL")
        modifier.width = bevel
        modifier.segments = 1
    obj.select_set(False)
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
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius, radius2=0.0, depth=depth)
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


def terrain_height(x, y):
    soft = math.sin(x * 0.32) * 0.09 + math.sin(y * 0.41 + 0.8) * 0.08
    back_hill = max(0.0, min(1.0, (y - 2.0) / 11.0))
    return 0.18 + soft + back_hill * back_hill * 0.55


def create_plateau(target, mats):
    segments = 48
    rings = 7
    vertices = [(0, 0, terrain_height(0, 0))]
    for ring in range(1, rings + 1):
        radius = ring / rings
        for index in range(segments):
            angle = index / segments * math.tau
            wobble = 1 + math.sin(angle * 5 + 0.4) * 0.035 + math.sin(angle * 9) * 0.018
            x = math.cos(angle) * 13.8 * radius * wobble
            y = math.sin(angle) * 11.8 * radius * wobble
            edge_drop = max(0, (radius - 0.82) / 0.18)
            z = terrain_height(x, y) - edge_drop * 0.18
            vertices.append((x, y, z))
    faces = []
    first = 1
    for index in range(segments):
        faces.append((0, first + index, first + (index + 1) % segments))
    for ring in range(2, rings + 1):
        prev = 1 + (ring - 2) * segments
        current = 1 + (ring - 1) * segments
        for index in range(segments):
            nxt = (index + 1) % segments
            faces.append((prev + index, current + index, prev + nxt))
            faces.append((prev + nxt, current + index, current + nxt))
    top = mesh_object("STYLE_SLICE_GRASS_PLATEAU", vertices, faces, mats["grass"], target)

    outer = 1 + (rings - 1) * segments
    cliff_vertices = []
    for index in range(segments):
        x, y, z = vertices[outer + index]
        cliff_vertices.extend(((x, y, z + 0.01), (x * 1.03, y * 1.03, -2.35 - 0.25 * math.sin(index * 0.7))))
    cliff_faces = []
    for index in range(segments):
        nxt = (index + 1) % segments
        cliff_faces.append((index * 2, index * 2 + 1, nxt * 2))
        cliff_faces.append((nxt * 2, index * 2 + 1, nxt * 2 + 1))
    mesh_object("STYLE_SLICE_STONE_EDGE", cliff_vertices, cliff_faces, mats["rock"], target)

    water_root = root("STYLE_SLICE_WATER", target, (0, 0, -2.62))
    cylinder(water_root, "Water_disc", (0, 0, 0), 28, 0.18, mats["water_dark"], vertices=64)


def create_ribbon(name, points, widths, mat, target, lift=0.045):
    vertices = []
    faces = []
    for index, point in enumerate(points):
        previous = Vector(points[max(0, index - 1)])
        following = Vector(points[min(len(points) - 1, index + 1)])
        tangent = (following - previous).normalized()
        side = Vector((-tangent.y, tangent.x, 0)).normalized()
        width = widths[index] if isinstance(widths, (list, tuple)) else widths
        center = Vector((point[0], point[1], terrain_height(point[0], point[1]) + lift))
        left = center + side * width * 0.5
        right = center - side * width * 0.5
        vertices.extend((tuple(left), tuple(right)))
        if index:
            a = (index - 1) * 2
            b = index * 2
            faces.extend(((a, b, a + 1), (a + 1, b, b + 1)))
    return mesh_object(name, vertices, faces, mat, target)


def create_path(target, mats):
    points = [(-0.8, -11.0), (-1.5, -7.2), (-0.8, -3.8), (-2.1, -0.2), (-0.5, 3.8), (1.8, 7.4), (1.5, 10.2)]
    create_ribbon("Winding_hill_path", points, [2.3, 2.45, 2.35, 2.15, 2.0, 1.85, 1.65], mats["path"], target)
    for index, (x, y) in enumerate(((-1.9, -6.4), (-0.4, -2.9), (-2.7, 0.9), (0.5, 4.8))):
        patch = root(f"Path_grass_patch_{index}", target, (x, y, terrain_height(x, y) + 0.075))
        sphere(patch, "patch", (0, 0, 0), (0.72, 0.28, 0.025), mats["grass_light"], 1)


def create_fence(name, start, end, target, mats):
    parent = root(name, target)
    start_v, end_v = Vector(start), Vector(end)
    delta = end_v - start_v
    length = delta.length
    angle = math.atan2(delta.y, delta.x)
    count = max(2, int(length / 1.55) + 1)
    for index in range(count):
        t = index / (count - 1)
        p = start_v.lerp(end_v, t)
        z = terrain_height(p.x, p.y)
        box(parent, f"{name}_post_{index}", (p.x, p.y, z + 0.75), (0.12, 0.12, 1.5), mats["wood"], rotation=(0.02, -0.02, angle * 0.015), bevel=0.015)
    midpoint = (start_v + end_v) * 0.5
    for z_offset in (0.55, 1.08):
        rail = box(parent, f"{name}_rail_{z_offset}", (midpoint.x, midpoint.y, terrain_height(midpoint.x, midpoint.y) + z_offset), (length, 0.11, 0.12), mats["wood"], rotation=(0, 0, angle), bevel=0.015)
        rail.rotation_euler.y = math.radians(1.2 if z_offset > 1 else -1.0)


def create_tree(name, x, y, scale, target, mats, lean=0.0):
    z = terrain_height(x, y)
    parent = root(name, target, (x, y, z), rotation=(0, lean, 0))
    cylinder(parent, name + "_trunk", (0, 0, 1.7 * scale), 0.20 * scale, 3.4 * scale, mats["rock_shadow"], vertices=8)
    for index, (lx, ly, lz, sx, sy, sz, shade) in enumerate((
        (-0.75, 0.00, 3.15, 1.15, 0.86, 1.05, "grass_dark"),
        (0.45, 0.12, 3.25, 1.35, 0.90, 1.12, "grass"),
        (0.05, -0.08, 4.05, 1.24, 0.84, 1.18, "grass_light"),
        (1.05, 0.03, 3.78, 0.88, 0.72, 0.90, "grass_dark"),
        (-1.20, 0.12, 3.82, 0.92, 0.74, 0.96, "grass"),
    )):
        sphere(parent, f"{name}_leaf_{index}", (lx * scale, ly * scale, lz * scale), (sx * scale, sy * scale, sz * scale), mats[shade], 2)
    return parent


def create_rock_cluster(name, x, y, target, mats, scale=1.0):
    z = terrain_height(x, y)
    parent = root(name, target, (x, y, z - 0.05))
    for index, (rx, ry, rz, sx, sy, sz, shade) in enumerate((
        (0, 0, 1.2, 2.7, 1.8, 1.7, "rock"),
        (-2.0, 0.3, 0.65, 1.65, 1.35, 1.05, "rock_shadow"),
        (1.9, 0.1, 0.72, 1.85, 1.55, 1.16, "rock"),
        (0.5, 0.3, 2.4, 1.75, 1.30, 1.65, "rock"),
    )):
        sphere(parent, f"{name}_rock_{index}", (rx * scale, ry * scale, rz * scale), (sx * scale, sy * scale, sz * scale), mats[shade], 2)
    return parent


def create_waterfall(target, mats):
    create_rock_cluster("Waterfall_rock", -5.0, 6.2, target, mats, 1.25)
    parent = root("Waterfall", target, (-4.55, 5.15, terrain_height(-5.0, 6.2) + 0.3))
    for index, (x, width, height, z) in enumerate(((-0.62, 0.85, 3.5, 2.65), (0.35, 0.62, 2.75, 2.15), (1.05, 0.40, 1.85, 1.52))):
        box(parent, f"Waterfall_ribbon_{index}", (x, -1.47, z), (width, 0.07, height), mats["water"], rotation=(0.04, 0.0, 0.02 * (index - 1)), bevel=0.015)
        box(parent, f"Waterfall_glint_{index}", (x - width * 0.18, -1.52, z + 0.1), (0.10, 0.025, height * 0.78), mats["cloud"], bevel=0.006)
    pool = sphere(parent, "Waterfall_pool", (0.05, -1.35, 0.31), (2.15, 1.25, 0.11), mats["water"], 2)
    pool.rotation_euler.z = -0.18


def create_hill_shrine(target, mats):
    """A compact north-Indian hill shrine: chhatri roof, bells, steps and saffron accents."""
    parent = root("HILL_SHRINE", target, (6.0, 4.7, terrain_height(6.0, 4.7)))
    box(parent, "Shrine_platform", (1.45, -0.05, 0.18), (6.3, 4.6, 0.36), mats["paper_shadow"], bevel=0.05)
    box(parent, "Shrine_back_wall", (1.45, 1.82, 1.45), (6.15, 0.30, 2.9), mats["paper"], bevel=0.035)
    box(parent, "Shrine_saffron_band", (1.45, 1.64, 2.26), (6.18, 0.07, 0.28), mats["orange"], bevel=0.015)
    for index, (x, y) in enumerate(((-0.75, -1.25), (3.65, -1.25), (-0.75, 1.25), (3.65, 1.25))):
        box(parent, f"Shrine_column_{index}", (x, y, 1.55), (0.48, 0.48, 2.75), mats["paper"], bevel=0.04)
        box(parent, f"Shrine_column_cap_{index}", (x, y, 2.98), (0.72, 0.68, 0.20), mats["paper_shadow"], bevel=0.025)
        box(parent, f"Shrine_column_foot_{index}", (x, y, 0.26), (0.66, 0.66, 0.25), mats["paper_shadow"], bevel=0.025)
    box(parent, "Shrine_canopy_slab", (1.45, 0, 3.20), (5.5, 3.35, 0.26), mats["orange"], bevel=0.055)
    sphere(parent, "Shrine_chhatri_dome", (1.45, 0, 3.55), (2.55, 1.48, 0.72), mats["paper"], 2)
    cylinder(parent, "Shrine_finial", (1.45, 0, 4.25), 0.10, 0.60, mats["orange"], vertices=10)
    sphere(parent, "Shrine_finial_top", (1.45, 0, 4.58), (0.18, 0.18, 0.23), mats["yellow"], 2)
    for index, x in enumerate((0.25, 1.45, 2.65)):
        cylinder(parent, f"Shrine_bell_{index}", (x, -1.55, 2.78), 0.12, 0.27, mats["yellow"], vertices=10)
        cylinder(parent, f"Shrine_bell_rope_{index}", (x, -1.55, 2.98), 0.018, 0.28, mats["ink"], vertices=6)
    for index in range(3):
        box(parent, f"Shrine_step_{index}", (1.45, -2.05 - index * 0.32, 0.08 + index * 0.11), (3.6 - index * 0.34, 0.65, 0.16 + index * 0.05), mats["path"], bevel=0.025)
    sphere(parent, "Shrine_vine_left", (-1.35, 1.62, 1.35), (0.62, 0.12, 1.04), mats["grass_dark"], 2)
    sphere(parent, "Shrine_vine_right", (4.30, 1.62, 1.15), (0.72, 0.12, 0.90), mats["grass_dark"], 2)


def create_chai_stall(target, mats):
    x, y = 8.5, -0.7
    parent = root("CHAI_STALL", target, (x, y, terrain_height(x, y)))
    box(parent, "Chai_counter", (0, 0, 0.72), (3.0, 1.35, 1.25), mats["wood"], bevel=0.055)
    box(parent, "Chai_counter_front", (0, -0.71, 0.78), (2.65, 0.08, 0.82), mats["paper_shadow"], bevel=0.025)
    for side in (-1, 1):
        box(parent, f"Chai_post_{side}", (side * 1.28, 0, 2.18), (0.12, 0.12, 3.15), mats["ink"], bevel=0.015)
    box(parent, "Chai_awning", (0, -0.12, 3.56), (3.55, 2.05, 0.20), mats["yellow"], rotation=(0.08, 0, 0), bevel=0.035)
    for index, stripe_x in enumerate((-1.10, -0.36, 0.38, 1.12)):
        box(parent, f"Chai_awning_stripe_{index}", (stripe_x, -0.64, 3.51), (0.32, 1.15, 0.06), mats["orange"], rotation=(0.08, 0, 0), bevel=0.01)
    box(parent, "Chai_sign", (0, -0.84, 3.00), (2.10, 0.10, 0.58), mats["orange"], bevel=0.035)
    for index, letter_x in enumerate((-0.48, 0, 0.48)):
        box(parent, f"Chai_sign_mark_{index}", (letter_x, -0.91, 3.0), (0.12, 0.035, 0.30 + index * 0.06), mats["paper"], rotation=(0, 0, 0.12 * (index - 1)), bevel=0.015)
    # Silhouette of a steel kettle and three cutting-chai glasses.
    sphere(parent, "Chai_kettle", (-0.62, -0.78, 1.57), (0.36, 0.24, 0.31), mats["paper"], 2)
    cylinder(parent, "Chai_kettle_lid", (-0.62, -0.78, 1.89), 0.16, 0.08, mats["ink"], vertices=10)
    box(parent, "Chai_kettle_spout", (-1.0, -0.78, 1.66), (0.52, 0.11, 0.12), mats["paper"], rotation=(0, -0.34, 0), bevel=0.025)
    for index in range(3):
        cylinder(parent, f"Chai_glass_{index}", (0.18 + index * 0.28, -0.78, 1.52), 0.085, 0.30, mats["water"], vertices=10)


def create_marigold_bunting(target, mats):
    vertices = []
    faces = []
    start = Vector((2.6, 3.7, 4.25))
    end = Vector((9.5, 4.2, 4.55))
    count = 13
    for index in range(count):
        t = index / (count - 1)
        center = start.lerp(end, t)
        center.z -= math.sin(math.pi * t) * 0.55
        vertices.extend(((center.x - 0.19, center.y, center.z), (center.x + 0.19, center.y, center.z), (center.x, center.y, center.z - 0.48)))
        faces.append((index * 3, index * 3 + 1, index * 3 + 2))
    mesh_object("MARIGOLD_BUNTING", vertices, faces, mats["yellow"], target)


def create_grass_tuft(name, x, y, target, mats, scale=1.0):
    z = terrain_height(x, y)
    parent = root(name, target, (x, y, z + 0.02))
    for index, angle in enumerate((-0.52, -0.22, 0.06, 0.30, 0.57)):
        blade = box(parent, f"{name}_blade_{index}", ((index - 2) * 0.09 * scale, 0, 0.24 * scale), (0.055 * scale, 0.035, 0.48 * scale), mats["grass_dark"], rotation=(0, angle, 0), bevel=0.008)
        blade.rotation_euler.y = angle


def create_character(target, mats):
    x, y = 1.2, -5.4
    z = terrain_height(x, y) + 0.11
    # Begin in a three-quarter pose so the character's face is visible in the style preview.
    player = root("PLAYER_RIG", target, (x, y, z), rotation=(0, 0, math.radians(146)))
    sphere(player, "Player_torso", (0, 0, 1.43), (0.47, 0.33, 0.61), mats["shirt"], 2, True)
    sphere(player, "Player_pants", (0, 0, 0.91), (0.41, 0.33, 0.40), mats["pants"], 2, True)
    cylinder(player, "Player_neck", (0, 0, 1.94), 0.115, 0.22, mats["skin"], vertices=10)
    sphere(player, "Player_head", (0, 0, 2.24), (0.34, 0.31, 0.39), mats["skin"], 3, True)

    # Face points toward local +Y. It is readable in front and three-quarter camera views.
    for side in (-1, 1):
        sphere(player, f"Player_ear_{side}", (side * 0.33, 0.0, 2.24), (0.08, 0.055, 0.13), mats["skin"], 2, True)
        sphere(player, f"Player_eye_white_{side}", (side * 0.13, 0.286, 2.31), (0.115, 0.052, 0.135), mats["eye_white"], 2, True)
        sphere(player, f"Player_eye_iris_{side}", (side * 0.13, 0.333, 2.30), (0.055, 0.025, 0.070), mats["eye_brown"], 2, True)
        sphere(player, f"Player_eye_glint_{side}", (side * 0.112, 0.354, 2.335), (0.016, 0.010, 0.019), mats["eye_white"], 1, True)
        box(player, f"Player_brow_{side}", (side * 0.13, 0.337, 2.46), (0.20, 0.035, 0.055), mats["hair"], rotation=(0, 0, side * -0.06), bevel=0.025)
    sphere(player, "Player_nose", (0, 0.326, 2.21), (0.055, 0.045, 0.075), mats["skin"], 2, True)
    box(player, "Player_smile", (0, 0.334, 2.09), (0.25, 0.035, 0.085), mats["smile"], bevel=0.04)
    box(player, "Player_teeth", (0, 0.356, 2.115), (0.17, 0.018, 0.032), mats["eye_white"], bevel=0.014)

    sphere(player, "Player_hair_cap", (0, 0.01, 2.49), (0.37, 0.32, 0.28), mats["hair"], 2, True)
    sphere(player, "Player_hair_back", (0, -0.24, 2.38), (0.31, 0.10, 0.23), mats["hair"], 2, True)
    for index, (hx, hy, hz, tilt) in enumerate((
        (-0.26, 0.03, 2.75, -0.30), (-0.14, 0.07, 2.80, -0.17),
        (0.00, 0.08, 2.83, 0.0), (0.14, 0.06, 2.80, 0.18),
        (0.27, 0.02, 2.73, 0.32), (-0.05, -0.14, 2.77, -0.05),
    )):
        cone(player, f"Player_hair_spike_{index}", (hx, hy, hz), 0.105, 0.36, mats["hair"], rotation=(tilt * 0.45, tilt, 0), vertices=7)

    # Shirt details: cream collar/cuffs and a simple front placket.
    box(player, "Player_shirt_placket", (0, 0.319, 1.48), (0.055, 0.035, 0.53), mats["paper"], bevel=0.015)
    for side in (-1, 1):
        box(player, f"Player_collar_{side}", (side * 0.12, 0.322, 1.79), (0.23, 0.04, 0.11), mats["paper"], rotation=(0, 0, side * 0.48), bevel=0.025)
        sphere(player, f"Player_sleeve_{side}", (side * 0.47, 0, 1.54), (0.18, 0.20, 0.25), mats["shirt"], 2, True)
        cylinder(player, f"Player_cuff_{side}", (side * 0.48, 0, 1.37), 0.105, 0.12, mats["paper"], vertices=10)
        cylinder(player, f"Player_arm_{side}", (side * 0.48, 0, 1.12), 0.09, 0.46, mats["skin"], rotation=(0, side * 0.06, side * 0.035), vertices=10)
        sphere(player, f"Player_hand_{side}", (side * 0.48, 0, 0.84), (0.105, 0.09, 0.13), mats["skin"], 2, True)
        cylinder(player, f"Player_leg_{side}", (side * 0.20, 0, 0.47), 0.13, 0.74, mats["pants"], vertices=10)
        box(player, f"Player_shoe_{side}", (side * 0.21, -0.12, 0.07), (0.34, 0.52, 0.22), mats["yellow"], bevel=0.07)
    return player


def create_musician(target, mats):
    x, y = -2.25, 4.45
    z = terrain_height(x, y) + 0.75
    npc = root("NPC_MUSICIAN", target, (x, y, z), rotation=(0, 0, -0.12))
    sphere(npc, "Musician_torso", (0, 0, 0.96), (0.42, 0.31, 0.57), mats["orange"], 2, True)
    sphere(npc, "Musician_head", (0, 0, 1.74), (0.29, 0.28, 0.34), mats["skin"], 3, True)
    sphere(npc, "Musician_hair", (0, 0.04, 1.88), (0.31, 0.28, 0.24), mats["paper_shadow"], 2, True)
    for side in (-1, 1):
        cylinder(npc, f"Musician_leg_{side}", (side * 0.22, -0.26, 0.36), 0.12, 0.72, mats["hair"], rotation=(math.pi / 2, 0, 0), vertices=10)
        cylinder(npc, f"Musician_arm_{side}", (side * 0.43, -0.05, 1.03), 0.08, 0.62, mats["skin"], rotation=(0.0, side * 0.68, 0), vertices=10)
    sphere(npc, "Musician_instrument", (0, -0.38, 0.98), (0.43, 0.16, 0.50), mats["paper_shadow"], 2, True)
    cylinder(npc, "Musician_instrument_neck", (0.48, -0.36, 1.36), 0.065, 1.25, mats["ink"], rotation=(0, -0.78, 0), vertices=8)


def create_sky(target, mats):
    sky = root("SKY_BACKDROP", target, (0, 18.5, 6.2))
    box(sky, "Sky_card", (0, 0.8, 0), (48, 0.18, 29), mats["sky"], bevel=0)
    cloud_shapes = (
        ((-11.0, 0.65, 5.8), (7.4, 0.05, 2.6), 0.16),
        ((5.7, 0.64, 7.1), (10.0, 0.05, 2.2), -0.12),
        ((-2.0, 0.62, 1.8), (5.8, 0.05, 1.5), 0.08),
        ((10.0, 0.61, -1.4), (4.9, 0.05, 1.3), -0.18),
    )
    for index, (loc, scale, rotation) in enumerate(cloud_shapes):
        cloud = sphere(sky, f"Painted_cloud_{index}", loc, scale, mats["cloud"], 2)
        cloud.rotation_euler.y = rotation


def point_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def configure_render():
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except Exception:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1440
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world = scene.world or bpy.data.worlds.new("Nimbu illustrated sky")
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = PALETTE["sky"]
    background.inputs["Strength"].default_value = 0.42
    scene.render.use_freestyle = True
    scene.render.line_thickness = 1.75
    lineset = bpy.context.view_layer.freestyle_settings.linesets[0]
    lineset.select_silhouette = True
    lineset.select_border = True
    lineset.select_crease = True
    lineset.select_external_contour = True
    lineset.select_material_boundary = True
    linestyle = lineset.linestyle
    linestyle.color = PALETTE["ink"][:3]
    linestyle.thickness = 1.75
    linestyle.alpha = 1.0
    try:
        scene.view_settings.view_transform = "Standard"
        scene.view_settings.look = "Medium High Contrast"
    except Exception:
        try:
            scene.view_settings.look = "AgX - Medium High Contrast"
        except Exception:
            pass


def build():
    clear_scene()
    mats = {name: material("Slice_" + name, color) for name, color in PALETTE.items()}
    export = make_collection("EXPORT_STYLE_SLICE")

    create_sky(export, mats)
    create_plateau(export, mats)
    create_path(export, mats)
    create_waterfall(export, mats)
    create_hill_shrine(export, mats)
    create_chai_stall(export, mats)
    create_marigold_bunting(export, mats)
    create_fence("Foreground_fence_left", (-11.0, -3.2, 0), (-2.55, -3.2, 0), export, mats)
    create_fence("Foreground_fence_right", (1.75, -3.2, 0), (8.7, -3.2, 0), export, mats)

    create_tree("Left_canopy_tree", -9.7, 1.2, 1.25, export, mats, -0.08)
    create_tree("Waterfall_tree", -7.6, 5.0, 0.82, export, mats, 0.12)
    create_tree("Right_ruin_tree", 9.2, 6.2, 0.88, export, mats, -0.05)
    create_tree("Far_leaning_tree", 0.4, 9.2, 0.72, export, mats, 0.24)

    for index, (x, y, scale) in enumerate(((-10.4, -6.8, 1.0), (-7.8, -7.6, 0.65), (8.8, -6.6, 0.72), (10.6, -2.0, 0.84))):
        create_rock_cluster(f"Loose_rocks_{index}", x, y, export, mats, scale * 0.36)
    for index, (x, y, scale) in enumerate(((-7.2, -1.8, 1.0), (-5.8, -4.8, 0.8), (5.2, -1.4, 0.9), (8.0, 1.0, 0.72), (2.2, 7.8, 0.65))):
        create_grass_tuft(f"Grass_tuft_{index}", x, y, export, mats, scale)

    create_character(export, mats)
    create_musician(export, mats)

    configure_render()
    bpy.ops.object.light_add(type="SUN", location=(-8, -12, 24))
    sun = bpy.context.object
    sun.name = "Illustrated_sun"
    sun.data.energy = 1.55
    sun.data.color = (1.0, 0.89, 0.72)
    sun.data.angle = math.radians(8)
    sun.rotation_euler = (math.radians(34), math.radians(-18), math.radians(-32))

    bpy.ops.object.light_add(type="AREA", location=(8, -10, 18))
    fill = bpy.context.object
    fill.name = "Illustrated_fill"
    fill.data.energy = 190
    fill.data.shape = "DISK"
    fill.data.size = 16
    point_at(fill, (0, 2, 0))

    bpy.ops.object.camera_add(location=(-8.6, -18.4, 7.2))
    camera = bpy.context.object
    camera.name = "Style_slice_gameplay_camera"
    camera.data.lens = 48
    point_at(camera, (-0.4, 2.1, 1.50))
    bpy.context.scene.camera = camera

    bpy.context.scene.render.filepath = RENDER_PATH
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
        export_apply=True,
    )
    bpy.ops.object.select_all(action="DESELECT")
    print("NIMBU STYLE SLICE COMPLETE", BLEND_PATH, GLB_PATH)


build()
