import bpy
import math
import os
import random
from mathutils import Vector, Matrix


ROOT = "/Users/rehaanr/Documents/openai"
BLEND_PATH = os.path.join(ROOT, "blender", "nimbu_planet_master.blend")
OUTPUT_DIR = os.path.join(ROOT, "blender", "output")
GLB_PATH = os.path.join(ROOT, "public", "assets", "nimbu_planet.glb")
RADIUS = 18.0
random.seed(20260717)

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(os.path.dirname(GLB_PATH), exist_ok=True)


PALETTE = {
    "grass": (0.33, 0.55, 0.31, 1),
    "grass_light": (0.51, 0.65, 0.39, 1),
    "grass_dry": (0.67, 0.63, 0.40, 1),
    "forest": (0.12, 0.36, 0.22, 1),
    "road": (0.34, 0.41, 0.40, 1),
    "road_light": (0.60, 0.61, 0.52, 1),
    "paper": (0.88, 0.87, 0.75, 1),
    "stone": (0.45, 0.48, 0.43, 1),
    "dark_stone": (0.25, 0.30, 0.29, 1),
    "teal": (0.28, 0.64, 0.58, 1),
    "blue": (0.20, 0.48, 0.61, 1),
    "saffron": (0.94, 0.55, 0.17, 1),
    "yellow": (0.95, 0.74, 0.24, 1),
    "red": (0.72, 0.22, 0.17, 1),
    "pink": (0.72, 0.45, 0.46, 1),
    "indigo": (0.13, 0.20, 0.28, 1),
    "brown": (0.35, 0.23, 0.15, 1),
    "wood": (0.48, 0.31, 0.17, 1),
    "water": (0.25, 0.68, 0.70, 1),
    "water_deep": (0.12, 0.43, 0.55, 1),
    "sky": (0.43, 0.79, 0.78, 1),
    "white": (0.96, 0.95, 0.86, 1),
    "ink": (0.06, 0.10, 0.12, 1),
}


TOWN_DIR = Vector((0.0, 0.0, 1.0))
MOUNTAIN_DIR = Vector((-0.64, 0.12, 0.76)).normalized()
LAKE_DIR = Vector((0.48, 0.16, 0.86)).normalized()
FOREST_DIR = Vector((-0.24, -0.62, 0.74)).normalized()
STATION_ANGLE = math.radians(-58)
RAIL_LATITUDE = math.radians(32)
STATION_DIR = Vector((
    math.cos(RAIL_LATITUDE) * math.cos(STATION_ANGLE),
    math.cos(RAIL_LATITUDE) * math.sin(STATION_ANGLE),
    math.sin(RAIL_LATITUDE),
)).normalized()


def smoothstep(edge0, edge1, value):
    t = max(0.0, min(1.0, (value - edge0) / (edge1 - edge0)))
    return t * t * (3.0 - 2.0 * t)


def terrain_height(direction):
    n = direction.normalized()
    detail = (
        math.sin(n.x * 11.2 + n.y * 4.3) * 0.12
        + math.sin(n.y * 17.5 - n.z * 6.1) * 0.08
        + math.sin((n.x + n.z) * 25.0) * 0.045
    )
    mountain = smoothstep(0.65, 0.97, n.dot(MOUNTAIN_DIR))
    foothills = smoothstep(0.38, 0.86, n.dot(MOUNTAIN_DIR))
    height = detail + foothills * 0.38 + mountain * mountain * 3.7

    town_mask = smoothstep(0.88, 0.975, n.dot(TOWN_DIR))
    height = height * (1.0 - town_mask * 0.88) + detail * 0.18 * town_mask

    lake_mask = smoothstep(0.94, 0.992, n.dot(LAKE_DIR))
    height -= lake_mask * 0.42
    return height


def surface(direction, altitude=0.0):
    n = direction.normalized()
    return n * (RADIUS + terrain_height(n) + altitude)


def tangent_basis(direction, preferred=None):
    up = direction.normalized()
    if preferred is None:
        preferred = Vector((0.0, 1.0, 0.0))
    forward = preferred - up * preferred.dot(up)
    if forward.length < 0.001:
        preferred = Vector((1.0, 0.0, 0.0))
        forward = preferred - up * preferred.dot(up)
    forward.normalize()
    right = forward.cross(up).normalized()
    return right, forward, up


def direction_from_local(center, across, along):
    right, forward, up = tangent_basis(center)
    return (up + right * (across / RADIUS) + forward * (along / RADIUS)).normalized()


def great_circle(a, b, t):
    a = a.normalized()
    b = b.normalized()
    dot = max(-1.0, min(1.0, a.dot(b)))
    angle = math.acos(dot)
    if angle < 0.0001:
        return a.copy()
    return ((math.sin((1.0 - t) * angle) / math.sin(angle)) * a
            + (math.sin(t * angle) / math.sin(angle)) * b).normalized()


def make_material(name, color, roughness=0.9, metallic=0.0, emission=0.0):
    material = bpy.data.materials.new(name)
    material.diffuse_color = color
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission > 0:
        bsdf.inputs["Emission Color"].default_value = color
        bsdf.inputs["Emission Strength"].default_value = emission
    return material


def make_vertex_material(name):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    vertex = nodes.new("ShaderNodeVertexColor")
    vertex.layer_name = "TerrainColor"
    links.new(vertex.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.94
    return material


MATS = {key: make_material("Nimbu_" + key, value) for key, value in PALETTE.items()}
MATS["glass"] = make_material("Nimbu_glass", (0.38, 0.72, 0.76, 1), 0.2, 0.05)
MATS["water"] = make_material("Nimbu_water", PALETTE["water"], 0.18, 0.03)
MATS["terrain"] = make_vertex_material("Nimbu_terrain_painterly")


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.curves, bpy.data.meshes, bpy.data.cameras, bpy.data.lights):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def collection(name):
    item = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(item)
    return item


def move_to_collection(obj, target):
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    target.objects.link(obj)


def add_empty(name, direction, altitude=0.0, forward=None, target_collection=None):
    obj = bpy.data.objects.new(name, None)
    if target_collection:
        target_collection.objects.link(obj)
    else:
        bpy.context.collection.objects.link(obj)
    n = direction.normalized()
    right, facing, up = tangent_basis(n, forward)
    rotation = Matrix((right, facing, up)).transposed().to_quaternion()
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = rotation
    obj.location = surface(n, altitude)
    return obj


def add_box(parent, name, location, dimensions, material, bevel=0.06):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.parent = parent
    obj.location = location
    obj.data.materials.append(material)
    if bevel > 0:
        modifier = obj.modifiers.new("Hand softened edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    return obj


def add_cylinder(parent, name, location, radius, depth, material, vertices=10, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=(0, 0, 0), rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.parent = parent
    obj.location = location
    obj.data.materials.append(material)
    return obj


def add_ico(parent, name, location, radius, material, subdivisions=1, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=radius, location=(0, 0, 0))
    obj = bpy.context.object
    obj.name = name
    obj.parent = parent
    obj.location = location
    obj.scale = scale
    obj.data.materials.append(material)
    return obj


def create_planet(target_collection):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=5, radius=RADIUS, location=(0, 0, 0))
    planet = bpy.context.object
    planet.name = "Nimbu_Nagar_Painterly_Planet"
    move_to_collection(planet, target_collection)

    mesh = planet.data
    for vertex in mesh.vertices:
        direction = vertex.co.normalized()
        vertex.co = direction * (RADIUS + terrain_height(direction))

    color_attr = mesh.color_attributes.new(name="TerrainColor", type="BYTE_COLOR", domain="CORNER")
    for polygon in mesh.polygons:
        for loop_index in polygon.loop_indices:
            vertex_index = mesh.loops[loop_index].vertex_index
            direction = mesh.vertices[vertex_index].co.normalized()
            height = terrain_height(direction)
            forest = smoothstep(0.72, 0.96, direction.dot(FOREST_DIR))
            dry = smoothstep(0.5, 0.86, direction.x * 0.55 - direction.y * 0.25 + 0.35)
            if height > 2.1:
                base = Vector(PALETTE["stone"][:3])
            elif forest > 0.45:
                base = Vector(PALETTE["forest"][:3]).lerp(Vector(PALETTE["grass"][:3]), 0.24)
            elif dry > 0.55:
                base = Vector(PALETTE["grass"][:3]).lerp(Vector(PALETTE["grass_dry"][:3]), dry * 0.5)
            else:
                base = Vector(PALETTE["grass"][:3]).lerp(Vector(PALETTE["grass_light"][:3]), 0.22)
            variation = 0.94 + 0.07 * math.sin(direction.x * 42 + direction.y * 31 + direction.z * 17)
            color_attr.data[loop_index].color = (*[max(0, min(1, c * variation)) for c in base], 1)

    planet.data.materials.append(MATS["terrain"])
    for polygon in mesh.polygons:
        polygon.use_smooth = False
    return planet


def create_ribbon(name, directions, width, material, altitude=0.05, closed=False, target_collection=None):
    vertices = []
    faces = []
    count = len(directions)
    for i, direction in enumerate(directions):
        previous = directions[(i - 1) % count] if closed or i > 0 else directions[i]
        following = directions[(i + 1) % count] if closed or i < count - 1 else directions[i]
        tangent = (following - previous).normalized()
        right = tangent.cross(direction).normalized()
        left_dir = (direction + right * (width * 0.5 / RADIUS)).normalized()
        right_dir = (direction - right * (width * 0.5 / RADIUS)).normalized()
        vertices.extend([surface(left_dir, altitude), surface(right_dir, altitude)])
    segment_count = count if closed else count - 1
    for i in range(segment_count):
        next_i = (i + 1) % count
        faces.append((i * 2, i * 2 + 1, next_i * 2 + 1, next_i * 2))
    mesh = bpy.data.meshes.new(name + "_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    (target_collection or bpy.context.collection).objects.link(obj)
    obj.data.materials.append(material)
    return obj


def create_disc(name, center, radius, material, altitude=0.08, rings=7, segments=64, target_collection=None):
    right, forward, up = tangent_basis(center)
    vertices = [surface(up, altitude)]
    faces = []
    for ring in range(1, rings + 1):
        ring_radius = radius * ring / rings
        for i in range(segments):
            angle = i / segments * math.tau
            direction = (up + right * (math.cos(angle) * ring_radius / RADIUS)
                         + forward * (math.sin(angle) * ring_radius / RADIUS)).normalized()
            vertices.append(surface(direction, altitude))
    for i in range(segments):
        faces.append((0, 1 + i, 1 + ((i + 1) % segments)))
    for ring in range(2, rings + 1):
        prev_start = 1 + (ring - 2) * segments
        curr_start = 1 + (ring - 1) * segments
        for i in range(segments):
            nxt = (i + 1) % segments
            faces.append((prev_start + i, curr_start + i, curr_start + nxt, prev_start + nxt))
    mesh = bpy.data.meshes.new(name + "_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    (target_collection or bpy.context.collection).objects.link(obj)
    obj.data.materials.append(material)
    return obj


def create_building(name, direction, width, depth, floors, wall, trim, sign=None, forward=None, target_collection=None):
    root = add_empty(name, direction, 0.05, forward, target_collection)
    floor_height = 1.25
    height = floors * floor_height
    add_box(root, name + "_body", (0, 0, height * 0.5), (width, depth, height), wall, 0.08)
    add_box(root, name + "_roof", (0, 0, height + 0.13), (width + 0.28, depth + 0.28, 0.25), trim, 0.06)
    add_box(root, name + "_plinth", (0, 0.08, 0.11), (width + 0.25, depth + 0.2, 0.22), MATS["stone"], 0.04)

    door = add_box(root, name + "_door", (-width * 0.23, -depth * 0.505, 0.66), (0.62, 0.12, 1.2), MATS["brown"], 0.035)
    door.rotation_euler.z = 0
    window_count = max(2, int(width / 1.35))
    for floor in range(floors):
        z = 0.78 + floor * floor_height
        for index in range(window_count):
            x = -width * 0.38 + index * (width * 0.76 / max(1, window_count - 1))
            if floor == 0 and abs(x + width * 0.23) < 0.45:
                continue
            add_box(root, f"{name}_window_{floor}_{index}", (x, -depth * 0.515, z), (0.58, 0.09, 0.58), trim, 0.025)
            add_box(root, f"{name}_glass_{floor}_{index}", (x, -depth * 0.57, z), (0.43, 0.045, 0.42), MATS["glass"], 0.01)
    if floors > 1:
        add_box(root, name + "_balcony", (0.18, -depth * 0.66, 1.42), (width * 0.78, 0.72, 0.14), MATS["stone"], 0.025)
        add_box(root, name + "_balcony_top_rail", (0.18, -depth * 0.95, 1.89), (width * 0.78, 0.065, 0.065), trim, 0.012)
        for rail_index in range(9):
            rail_x = -width * 0.30 + rail_index * (width * 0.075)
            add_box(root, name + f"_balcony_bar_{rail_index}", (rail_x, -depth * 0.95, 1.60), (0.04, 0.04, 0.60), trim, 0.008)

    if sign:
        add_box(root, name + "_sign", (width * 0.18, -depth * 0.58, 1.15), (width * 0.48, 0.10, 0.42), MATS["paper"], 0.025)
        awning = add_box(root, name + "_awning", (0, -depth * 0.72, 1.28), (width * 0.72, 0.92, 0.13), trim, 0.025)
        awning.rotation_euler.x = math.radians(-9)
    if floors >= 2:
        add_box(root, name + "_drain_pipe", (width * 0.47, -depth * 0.53, height * 0.52), (0.10, 0.10, height * 0.9), MATS["dark_stone"], 0.015)
        if random.random() > 0.35:
            ac_height = min(height - 0.48, 2.45)
            add_box(root, name + "_ac_body", (-width * 0.28, -depth * 0.58, ac_height), (0.72, 0.24, 0.46), MATS["paper"], 0.055)
            add_box(root, name + "_ac_vent", (-width * 0.28, -depth * 0.72, ac_height - 0.08), (0.52, 0.05, 0.09), MATS["dark_stone"], 0.01)
    if floors >= 3:
        for roof_x in (-width * 0.38, width * 0.38):
            add_box(root, name + f"_roof_post_{roof_x}", (roof_x, 0, height + 0.58), (0.055, 0.055, 0.88), MATS["ink"], 0.008)
        add_box(root, name + "_roof_rail", (0, 0, height + 0.98), (width * 0.86, 0.055, 0.055), MATS["ink"], 0.008)
    if floors >= 2 and random.random() > 0.35:
        add_cylinder(root, name + "_water_tank", (width * 0.24, 0.06, height + 0.63), 0.38, 0.72, MATS["indigo"], 12)
    return root


def create_tree(name, direction, scale=1.0, dark=False, target_collection=None):
    root = add_empty(name, direction, 0.02, target_collection=target_collection)
    add_cylinder(root, name + "_trunk", (0, 0, 0.58 * scale), 0.13 * scale, 1.16 * scale, MATS["wood"], 8)
    leaf_mat = MATS["forest"] if dark else MATS["grass_light"]
    add_ico(root, name + "_crown_a", (0, 0, 1.55 * scale), 0.78 * scale, leaf_mat, 1, (1.0, 0.9, 1.05))
    add_ico(root, name + "_crown_b", (0.42 * scale, 0.05, 1.48 * scale), 0.55 * scale, leaf_mat, 1)
    add_ico(root, name + "_crown_c", (-0.35 * scale, 0.08, 1.42 * scale), 0.5 * scale, leaf_mat, 1)
    return root


def create_mountain(name, direction, scale=1.0, target_collection=None):
    root = add_empty(name, direction, -0.25, target_collection=target_collection)
    bpy.ops.mesh.primitive_cone_add(vertices=7, radius1=2.55 * scale, radius2=0.12, depth=5.8 * scale, location=(0, 0, 0))
    body = bpy.context.object
    body.name = name + "_body"
    body.parent = root
    body.location = (0, 0, 2.7 * scale)
    body.scale.y = 0.84
    body.data.materials.append(MATS["forest"])
    bpy.ops.mesh.primitive_cone_add(vertices=7, radius1=0.95 * scale, radius2=0.05, depth=1.3 * scale, location=(0, 0, 0))
    snow = bpy.context.object
    snow.name = name + "_snow"
    snow.parent = root
    snow.location = (0, 0, 5.05 * scale)
    snow.scale.y = 0.84
    snow.data.materials.append(MATS["white"])
    return root


def create_market_stall(name, direction, color, forward=None, target_collection=None):
    root = add_empty(name, direction, 0.06, forward, target_collection)
    add_box(root, name + "_counter", (0, -0.05, 0.52), (2.1, 0.9, 0.22), MATS["wood"], 0.04)
    for x in (-0.9, 0.9):
        add_box(root, name + f"_post_{x}", (x, 0, 1.35), (0.09, 0.09, 2.4), MATS["ink"], 0.015)
    add_box(root, name + "_canopy", (0, 0, 2.45), (2.35, 1.25, 0.16), color, 0.04)
    for i, mat_name in enumerate(("red", "yellow", "grass_light", "saffron")):
        add_ico(root, name + f"_produce_{i}", (-0.62 + i * 0.42, -0.22, 0.76), 0.16, MATS[mat_name], 1)
    return root


def create_utility_pole(name, direction, target_collection=None):
    root = add_empty(name, direction, 0.04, target_collection=target_collection)
    add_cylinder(root, name + "_pole", (0, 0, 2.65), 0.115, 5.3, MATS["dark_stone"], 10)
    add_box(root, name + "_crossbar", (0, 0, 4.65), (1.45, 0.12, 0.12), MATS["ink"], 0.018)
    for x in (-0.56, 0, 0.56):
        add_cylinder(root, name + f"_insulator_{x}", (x, 0, 4.85), 0.075, 0.28, MATS["paper"], 8)
    return root


def create_cable(name, direction_a, direction_b, target_collection=None):
    start = surface(direction_a, 4.78)
    end = surface(direction_b, 4.78)
    points = []
    for index in range(13):
        t = index / 12
        chord = start.lerp(end, t)
        local_up = chord.normalized()
        sag = math.sin(t * math.pi) * 0.42
        points.append(chord - local_up * sag)
    curve = bpy.data.curves.new(name + "_curve", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = 0.026
    curve.bevel_resolution = 0
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, position in zip(spline.points, points):
        point.co = (*position, 1)
    obj = bpy.data.objects.new(name, curve)
    (target_collection or bpy.context.collection).objects.link(obj)
    obj.data.materials.append(MATS["ink"])
    return obj


def create_planter(name, direction, scale=1.0, target_collection=None):
    root = add_empty(name, direction, 0.04, target_collection=target_collection)
    add_box(root, name + "_pot", (0, 0, 0.25 * scale), (0.62 * scale, 0.52 * scale, 0.48 * scale), MATS["pink"], 0.08)
    for index, (x, y, z) in enumerate(((-0.16, 0, 0.62), (0.14, 0.05, 0.72), (0, -0.1, 0.82))):
        add_ico(root, name + f"_leaf_{index}", (x * scale, y * scale, z * scale), 0.23 * scale, MATS["forest"], 1, (0.72, 0.45, 1.25))
    return root


def create_traffic_cone(name, direction, target_collection=None):
    root = add_empty(name, direction, 0.08, target_collection=target_collection)
    add_box(root, name + "_base", (0, 0, 0.05), (0.42, 0.42, 0.10), MATS["ink"], 0.025)
    bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.19, radius2=0.055, depth=0.62, location=(0, 0, 0))
    cone = bpy.context.object
    cone.name = name + "_orange"
    cone.parent = root
    cone.location = (0, 0, 0.37)
    cone.data.materials.append(MATS["saffron"])
    add_cylinder(root, name + "_stripe", (0, 0, 0.42), 0.145, 0.12, MATS["paper"], 12)
    return root


def create_parked_van(name, direction, forward, target_collection=None):
    root = add_empty(name, direction, 0.14, forward, target_collection)
    add_box(root, name + "_lower", (0, 0, 0.58), (1.55, 2.75, 0.86), MATS["paper"], 0.16)
    add_box(root, name + "_upper", (0, 0.23, 1.28), (1.48, 2.18, 0.76), MATS["paper"], 0.18)
    add_box(root, name + "_windshield", (0, -1.16, 1.35), (1.22, 0.07, 0.54), MATS["glass"], 0.025)
    for side in (-0.77, 0.77):
        for y in (-0.48, 0.38):
            add_box(root, name + f"_window_{side}_{y}", (side, y, 1.35), (0.055, 0.62, 0.46), MATS["glass"], 0.018)
        for y in (-0.86, 0.86):
            add_cylinder(root, name + f"_wheel_{side}_{y}", (side, y, 0.34), 0.28, 0.17, MATS["ink"], 12, (0, math.pi / 2, 0))
    add_box(root, name + "_bumper", (0, -1.41, 0.45), (1.52, 0.16, 0.18), MATS["dark_stone"], 0.035)
    return root


def create_character(name, direction, forward=None, target_collection=None):
    root = add_empty(name, direction, 0.08, forward, target_collection)
    add_cylinder(root, name + "_body", (0, 0, 1.28), 0.29, 0.78, MATS["indigo"], 10)
    add_box(root, name + "_trousers", (0, 0, 0.82), (0.62, 0.42, 0.54), MATS["blue"], 0.16)
    add_ico(root, name + "_head", (0, -0.02, 1.92), 0.31, MATS["saffron"], 2, (0.90, 0.86, 1.03))
    add_ico(root, name + "_hair", (0, 0.02, 2.10), 0.33, MATS["ink"], 2, (0.95, 0.90, 0.58))
    for x in (-0.36, 0.36):
        add_cylinder(root, name + f"_arm_{x}", (x, 0, 1.25), 0.075, 0.72, MATS["saffron"], 8)
        add_ico(root, name + f"_hand_{x}", (x, 0, 0.88), 0.09, MATS["saffron"], 1)
    for x in (-0.16, 0.16):
        add_cylinder(root, name + f"_leg_{x}", (x, 0, 0.48), 0.095, 0.82, MATS["blue"], 8)
        add_box(root, name + f"_shoe_{x}", (x, -0.09, 0.08), (0.22, 0.42, 0.16), MATS["yellow"], 0.035)
    add_box(root, name + "_backpack", (0, 0.30, 1.27), (0.54, 0.28, 0.66), MATS["dark_stone"], 0.11)
    add_box(root, name + "_backpack_flap", (0, 0.455, 1.40), (0.42, 0.06, 0.24), MATS["stone"], 0.035)
    return root


def create_station(direction, tangent, target_collection):
    root = add_empty("Nimbu_Railway_Station", direction, 0.09, tangent, target_collection)
    add_box(root, "Station_platform", (0, 0, 0.12), (8.4, 2.8, 0.24), MATS["paper"], 0.04)
    add_box(root, "Station_building", (0, 1.1, 1.15), (5.2, 2.1, 2.3), MATS["teal"], 0.08)
    add_box(root, "Station_roof", (0, 0.95, 2.52), (5.7, 2.5, 0.25), MATS["red"], 0.05)
    add_box(root, "Station_sign", (0, -0.08, 2.0), (3.8, 0.11, 0.52), MATS["paper"], 0.025)
    for x in (-3.4, 3.4):
        add_box(root, f"Station_canopy_post_{x}", (x, -0.72, 1.08), (0.09, 0.09, 2.0), MATS["ink"], 0.015)
    add_box(root, "Station_canopy", (0, -0.72, 2.1), (7.2, 1.55, 0.16), MATS["yellow"], 0.035)
    return root


def create_train(direction, tangent, target_collection):
    root = add_empty("Nimbu_Express_Train", direction, 0.22, tangent, target_collection)
    for car_index, color_name in enumerate(("red", "yellow", "blue")):
        y = -2.8 + car_index * 2.75
        add_box(root, f"Train_car_{car_index}_body", (0, y, 0.78), (1.5, 2.35, 1.45), MATS[color_name], 0.14)
        add_box(root, f"Train_car_{car_index}_roof", (0, y, 1.58), (1.64, 2.5, 0.18), MATS["paper"], 0.08)
        for side in (-0.76, 0.76):
            for offset in (-0.65, 0, 0.65):
                add_box(root, f"Train_window_{car_index}_{side}_{offset}", (side, y + offset, 1.02), (0.05, 0.46, 0.46), MATS["glass"], 0.015)
        for side in (-0.72, 0.72):
            for offset in (-0.72, 0.72):
                add_cylinder(root, f"Train_wheel_{car_index}_{side}_{offset}", (side, y + offset, 0.24), 0.24, 0.16, MATS["ink"], 12, (0, math.pi / 2, 0))
    return root


def create_lighting():
    world = bpy.context.scene.world or bpy.data.worlds.new("Nimbu sky")
    bpy.context.scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = PALETTE["sky"]
    background.inputs["Strength"].default_value = 0.55

    bpy.ops.object.light_add(type="SUN", location=(8, -12, 26))
    sun = bpy.context.object
    sun.name = "Golden afternoon sun"
    sun.data.energy = 2.35
    sun.data.color = (1.0, 0.73, 0.46)
    sun.rotation_euler = (math.radians(24), math.radians(-18), math.radians(-38))
    sun.data.angle = math.radians(8)

    bpy.ops.object.light_add(type="AREA", location=(-18, -10, 25))
    fill = bpy.context.object
    fill.name = "Cool sky fill"
    fill.data.energy = 640
    fill.data.shape = "DISK"
    fill.data.size = 16
    fill.data.color = (0.42, 0.68, 1.0)
    point_camera(fill, Vector((0, 0, 8)))


def point_camera(obj, target):
    direction = target - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def create_camera(name, location, target, lens=48):
    bpy.ops.object.camera_add(location=location)
    camera = bpy.context.object
    camera.name = name
    camera.data.lens = lens
    camera.data.sensor_width = 36
    point_camera(camera, target)
    return camera


def add_cloud(name, location, scale, target_collection):
    root = bpy.data.objects.new(name, None)
    target_collection.objects.link(root)
    root.location = location
    for index, (x, y, z, size) in enumerate((
        (-0.75, 0, 0, 0.72), (0, 0, 0.18, 0.95), (0.78, 0.05, 0, 0.68), (0.18, -0.18, -0.16, 0.64)
    )):
        add_ico(root, f"{name}_puff_{index}", (x * scale, y * scale, z * scale), size * scale, MATS["white"], 1)
    return root


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
    scene.render.use_file_extension = True
    try:
        scene.render.use_freestyle = True
        scene.render.line_thickness = 1.15
        lineset = bpy.context.view_layer.freestyle_settings.linesets[0]
        lineset.select_silhouette = True
        lineset.select_border = True
        lineset.select_crease = True
        lineset.select_external_contour = True
        freestyle = lineset.linestyle
        freestyle.color = (0.055, 0.085, 0.09)
        freestyle.thickness = 1.15
    except Exception:
        pass
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except Exception:
        pass


def build_scene():
    clear_scene()
    world_collection = collection("EXPORT_WORLD")
    atmosphere_collection = collection("ATMOSPHERE_RENDER_ONLY")
    planet = create_planet(world_collection)

    # Village roads and the routes toward the railway and mountains.
    village_points = [
        direction_from_local(TOWN_DIR, math.sin((-9.0 + i * 0.18) * 0.35) * 0.58, -9.0 + i * 0.18)
        for i in range(101)
    ]
    create_ribbon("Neem_Lane", village_points, 2.75, MATS["road"], 0.07, target_collection=world_collection)
    create_ribbon("Neem_Lane_center", village_points, 0.10, MATS["yellow"], 0.105, target_collection=world_collection)
    for side in (-1, 1):
        sidewalk_dirs = []
        for i, direction in enumerate(village_points):
            previous = village_points[max(0, i - 1)]
            following = village_points[min(len(village_points) - 1, i + 1)]
            tangent = (following - previous).normalized()
            right = tangent.cross(direction).normalized()
            sidewalk_dirs.append((direction + right * (side * 2.05 / RADIUS)).normalized())
        create_ribbon(f"Neem_Lane_sidewalk_{side}", sidewalk_dirs, 1.15, MATS["paper"], 0.085, target_collection=world_collection)

    station_road = [great_circle(direction_from_local(TOWN_DIR, 4.5, -4), STATION_DIR, i / 85) for i in range(86)]
    create_ribbon("Station_Road", station_road, 1.55, MATS["road_light"], 0.065, target_collection=world_collection)

    mountain_road_start = direction_from_local(TOWN_DIR, -5.2, 5.2)
    mountain_road = []
    for i in range(111):
        t = i / 110
        direction = great_circle(mountain_road_start, MOUNTAIN_DIR, t)
        tangent = MOUNTAIN_DIR - direction * MOUNTAIN_DIR.dot(direction)
        side = direction.cross(tangent).normalized()
        direction = (direction + side * (math.sin(t * math.tau * 2.5) * math.sin(t * math.pi) * 0.08)).normalized()
        mountain_road.append(direction)
    create_ribbon("Devgarh_switchbacks", mountain_road, 1.25, MATS["road_light"], 0.075, target_collection=world_collection)

    # Railway belt.
    rail_dirs = [Vector((
        math.cos(RAIL_LATITUDE) * math.cos(i / 180 * math.tau),
        math.cos(RAIL_LATITUDE) * math.sin(i / 180 * math.tau),
        math.sin(RAIL_LATITUDE),
    )).normalized() for i in range(180)]
    create_ribbon("Rail_ballast", rail_dirs, 1.65, MATS["stone"], 0.08, True, world_collection)
    create_ribbon("Rail_left", rail_dirs, 0.11, MATS["ink"], 0.15, True, world_collection)
    shifted_rail_dirs = []
    for i, direction in enumerate(rail_dirs):
        tangent = (rail_dirs[(i + 1) % len(rail_dirs)] - rail_dirs[(i - 1) % len(rail_dirs)]).normalized()
        right = tangent.cross(direction).normalized()
        shifted_rail_dirs.append((direction - right * (1.18 / RADIUS)).normalized())
    create_ribbon("Rail_right", shifted_rail_dirs, 0.11, MATS["ink"], 0.15, True, world_collection)

    for i in range(0, 180, 3):
        direction = rail_dirs[i]
        tangent = (rail_dirs[(i + 1) % 180] - rail_dirs[(i - 1) % 180]).normalized()
        root = add_empty(f"Sleeper_{i:03d}", direction, 0.12, tangent, world_collection)
        add_box(root, f"Sleeper_mesh_{i:03d}", (0, 0, 0.03), (1.62, 0.22, 0.08), MATS["wood"], 0.015)

    station_index = min(range(len(rail_dirs)), key=lambda i: rail_dirs[i].dot(STATION_DIR) * -1)
    station_tangent = (rail_dirs[(station_index + 1) % 180] - rail_dirs[(station_index - 1) % 180]).normalized()
    create_station(STATION_DIR, station_tangent, world_collection)
    train_direction = rail_dirs[(station_index - 5) % 180]
    create_train(train_direction, station_tangent, world_collection)

    # Lake and shore.
    create_disc("Neel_Taal_shore", LAKE_DIR, 4.0, MATS["paper"], 0.07, 8, 72, world_collection)
    create_disc("Neel_Taal_water", LAKE_DIR, 3.35, MATS["water"], 0.11, 8, 72, world_collection)
    lake_root = add_empty("Neel_Taal_jetty", direction_from_local(LAKE_DIR, 0, -2.8), 0.14, target_collection=world_collection)
    add_box(lake_root, "Jetty_deck", (0, -0.9, 0.16), (1.25, 3.5, 0.18), MATS["wood"], 0.035)
    for x in (-0.52, 0.52):
        for y in (-2.2, 0.3):
            add_cylinder(lake_root, f"Jetty_post_{x}_{y}", (x, y, -0.1), 0.07, 0.85, MATS["ink"], 7)

    # Village architecture: dense enough to feel authored, with open sightlines.
    building_specs = [
        (-4.15, 6.2, 3.4, 2.6, 3, "paper", "teal"),
        (-4.25, 2.15, 3.0, 2.4, 2, "pink", "indigo"),
        (-4.15, -1.9, 3.6, 2.6, 3, "teal", "yellow"),
        (-4.1, -6.0, 3.2, 2.4, 2, "saffron", "red"),
        (4.15, 6.2, 3.6, 2.5, 3, "yellow", "red"),
        (4.25, 2.05, 3.2, 2.4, 2, "paper", "blue"),
        (4.15, -2.0, 3.5, 2.6, 3, "blue", "paper"),
        (4.05, -6.1, 3.2, 2.5, 2, "teal", "paper"),
        (-2.15, 9.0, 3.8, 2.7, 2, "paper", "red"),
        (2.15, 9.0, 3.5, 2.6, 2, "saffron", "indigo"),
    ]
    for index, (x, y, width, depth, floors, wall, trim) in enumerate(building_specs):
        direction = direction_from_local(TOWN_DIR, x, y)
        road_forward = Vector((1 if x > 0 else -1, 0, 0)) if abs(x) > 3 else Vector((0, 1, 0))
        create_building(
            f"Village_building_{index:02d}", direction, width, depth, floors,
            MATS[wall], MATS[trim], sign=index in (0, 2, 4, 5), forward=road_forward,
            target_collection=world_collection,
        )

    create_market_stall("Chai_stall", direction_from_local(TOWN_DIR, 2.85, 5.0), MATS["saffron"], Vector((1, 0, 0)), world_collection)
    create_market_stall("Sabzi_stall", direction_from_local(TOWN_DIR, -2.9, -4.3), MATS["teal"], Vector((-1, 0, 0)), world_collection)

    # Street-level density is intentional: readable silhouettes with lived-in detail.
    pole_directions = []
    for index, (x, y) in enumerate(((-2.85, -6.8), (2.9, -3.2), (-2.85, 0.2), (2.9, 3.8), (-2.8, 7.0))):
        pole_direction = direction_from_local(TOWN_DIR, x, y)
        pole_directions.append(pole_direction)
        create_utility_pole(f"Utility_pole_{index:02d}", pole_direction, world_collection)
    for index in range(len(pole_directions) - 1):
        create_cable(f"Overhead_wire_{index:02d}", pole_directions[index], pole_directions[index + 1], world_collection)
    create_parked_van("Milk_delivery_van", direction_from_local(TOWN_DIR, 2.12, 4.25), Vector((0, 1, 0)), world_collection)
    for index, (x, y) in enumerate(((1.55, -1.1), (1.72, -0.5), (-1.65, 5.8), (1.7, 5.4))):
        create_traffic_cone(f"Traffic_cone_{index:02d}", direction_from_local(TOWN_DIR, x, y), world_collection)
    for index, (x, y, scale) in enumerate(((-2.65, -2.4, 0.8), (2.72, -5.3, 0.92), (-2.7, 3.4, 0.82), (2.7, 6.8, 0.9))):
        create_planter(f"Street_planter_{index:02d}", direction_from_local(TOWN_DIR, x, y), scale, world_collection)

    # A crosswalk and drain covers make the road read as an authored street rather than a ribbon.
    for index in range(5):
        stripe_root = add_empty(
            f"Crosswalk_{index}", direction_from_local(TOWN_DIR, -0.76 + index * 0.38, 3.0),
            0.12, Vector((0, 1, 0)), world_collection,
        )
        add_box(stripe_root, f"Crosswalk_mesh_{index}", (0, 0, 0.02), (0.23, 1.18, 0.035), MATS["paper"], 0.01)
    for index, y in enumerate((-5.0, 1.2, 6.4)):
        drain_root = add_empty(f"Drain_{index}", direction_from_local(TOWN_DIR, 0.55, y), 0.115, target_collection=world_collection)
        add_cylinder(drain_root, f"Drain_mesh_{index}", (0, 0, 0.015), 0.28, 0.035, MATS["dark_stone"], 16)

    # Mountains remain separated from playable clearings while filling the horizon.
    for index, (across, along, scale) in enumerate((
        (-2.8, -1.0, 1.15), (2.9, -0.4, 1.0), (-5.2, 2.7, 0.78),
        (5.4, 2.6, 0.82), (0.2, 5.0, 1.32),
    )):
        create_mountain(
            f"Devgarh_peak_{index:02d}", direction_from_local(MOUNTAIN_DIR, across, along),
            scale, world_collection,
        )

    # Vegetation belts; Fibonacci-like spacing avoids obvious rows.
    tree_index = 0
    for region, count, inner, outer, dark_bias in (
        (FOREST_DIR, 54, 2.4, 8.2, 0.72),
        (LAKE_DIR, 20, 4.4, 7.0, 0.35),
        (MOUNTAIN_DIR, 24, 6.0, 10.0, 0.65),
        (TOWN_DIR, 20, 9.2, 12.0, 0.30),
    ):
        for i in range(count):
            angle = i * 2.399963 + random.uniform(-0.15, 0.15)
            distance = inner + (outer - inner) * math.sqrt((i + 0.5) / count)
            direction = direction_from_local(region, math.cos(angle) * distance, math.sin(angle) * distance)
            scale = random.uniform(0.7, 1.22)
            create_tree(f"Tree_{tree_index:03d}", direction, scale, random.random() < dark_bias, world_collection)
            tree_index += 1

    # Small rocks and grass clumps close the otherwise empty spaces.
    for index in range(72):
        theta = index * 2.399963
        z = 1.0 - 2.0 * ((index + 0.5) / 72)
        radial = math.sqrt(max(0.0, 1.0 - z * z))
        direction = Vector((math.cos(theta) * radial, math.sin(theta) * radial, z)).normalized()
        if direction.dot(TOWN_DIR) > 0.82 or direction.dot(LAKE_DIR) > 0.9:
            continue
        root = add_empty(f"Rock_{index:03d}", direction, 0.02, target_collection=world_collection)
        add_ico(root, f"Rock_mesh_{index:03d}", (0, 0, 0.16), random.uniform(0.16, 0.38), MATS["stone"], 1,
                (random.uniform(0.75, 1.5), random.uniform(0.7, 1.2), random.uniform(0.55, 1.0)))

    player_direction = direction_from_local(TOWN_DIR, 0, -3.2)
    player_forward = Vector((0, 1, 0))
    create_character("Mahi_player", player_direction, player_forward, world_collection)

    # Render-only clouds preserve a clean web export.
    add_cloud("Cloud_A", (-15, 15, 30), 1.15, atmosphere_collection)
    add_cloud("Cloud_B", (18, 12, 29), 0.95, atmosphere_collection)
    add_cloud("Cloud_C", (-5, -20, 30), 1.2, atmosphere_collection)

    create_lighting()
    configure_render()

    # Third-person composition used to judge actual gameplay readability.
    player_surface = surface(player_direction, 0.1)
    _, player_tangent, player_up = tangent_basis(player_direction, player_forward)
    player_right = player_tangent.cross(player_up).normalized()
    hero_location = player_surface + player_up * 3.25 - player_tangent * 7.8 + player_right * 1.35
    hero_target = player_surface + player_up * 1.35 + player_tangent * 5.4
    hero_camera = create_camera("Gameplay_hero_camera", hero_location, hero_target, 45)

    overview_camera = create_camera("Planet_overview_camera", Vector((47, -59, 45)), Vector((0, 0, 1.5)), 54)
    scene = bpy.context.scene
    scene.camera = hero_camera
    scene.render.filepath = os.path.join(OUTPUT_DIR, "nimbu_gameplay_hero.png")
    bpy.ops.render.render(write_still=True)
    scene.camera = overview_camera
    scene.render.filepath = os.path.join(OUTPUT_DIR, "nimbu_planet_overview.png")
    bpy.ops.render.render(write_still=True)
    scene.camera = hero_camera

    bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)

    # Export only the authored world, excluding lights, cameras, and render-only clouds.
    bpy.ops.object.select_all(action="DESELECT")
    for obj in world_collection.all_objects:
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
    planet.select_set(True)
    bpy.context.view_layer.objects.active = planet
    print("NIMBU_BUILD_COMPLETE", BLEND_PATH, GLB_PATH)


build_scene()
