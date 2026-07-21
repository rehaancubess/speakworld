import bpy
import json
import math
import os
import random
from mathutils import Matrix, Vector


ROOT = "/Users/rehaanr/Documents/openai"
OUTPUT_DIR = os.path.join(ROOT, "blender", "output")
BLEND_PATH = os.path.join(ROOT, "blender", "nimbu_india_planet_base.blend")
GLB_PATH = os.path.join(ROOT, "public", "assets", "nimbu_india_planet_base.glb")
REPORT_PATH = os.path.join(OUTPUT_DIR, "nimbu_india_planet_base_report.json")

RADIUS = 38.0
SEED = 20260718
random.seed(SEED)

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(os.path.dirname(GLB_PATH), exist_ok=True)


COLORS = {
    "sky": (0.22, 0.66, 0.69, 1),
    "grass": (0.30, 0.57, 0.31, 1),
    "grass_light": (0.48, 0.68, 0.35, 1),
    "grass_dark": (0.12, 0.39, 0.24, 1),
    "meadow": (0.64, 0.70, 0.37, 1),
    "earth": (0.68, 0.55, 0.36, 1),
    "earth_light": (0.80, 0.70, 0.50, 1),
    "stone": (0.46, 0.49, 0.43, 1),
    "stone_light": (0.67, 0.66, 0.55, 1),
    "stone_dark": (0.34, 0.40, 0.40, 1),
    "snow": (0.92, 0.95, 0.89, 1),
    "water": (0.12, 0.62, 0.72, 1),
    "water_light": (0.40, 0.84, 0.83, 1),
    "trunk": (0.34, 0.22, 0.13, 1),
    "paper": (0.90, 0.87, 0.73, 1),
    "saffron": (0.95, 0.50, 0.12, 1),
    "gold": (0.94, 0.70, 0.20, 1),
    "teal": (0.07, 0.50, 0.51, 1),
    "ink": (0.055, 0.10, 0.12, 1),
    "cloud": (0.82, 0.93, 0.87, 1),
    "shirt": (0.05, 0.52, 0.55, 1),
    "pants": (0.08, 0.18, 0.24, 1),
    "skin": (0.54, 0.29, 0.17, 1),
}


TOP = Vector((0.0, 0.0, 1.0))


def clamp(value, low=0.0, high=1.0):
    return max(low, min(high, value))


def smoothstep(edge0, edge1, value):
    if edge1 == edge0:
        return 0.0
    t = clamp((value - edge0) / (edge1 - edge0))
    return t * t * (3.0 - 2.0 * t)


def tangent_basis(direction, preferred=Vector((0.0, 1.0, 0.0))):
    up = direction.normalized()
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


def local_direction(across, along):
    return direction_from_local(TOP, across, along)


HIMALAYA_CENTERS = [
    local_direction(-19.0, 22.5),
    local_direction(-9.5, 26.0),
    local_direction(0.0, 28.0),
    local_direction(10.0, 25.5),
    local_direction(19.0, 21.5),
]
LAKE_CENTER = local_direction(11.5, 10.0)
TERRACE_CENTER = local_direction(-17.0, 7.0)
FOREST_CENTER = local_direction(-23.0, -6.0)
MANDIR_CENTER = local_direction(19.0, 14.0)


def gaussian_direction(direction, center, start, end):
    return smoothstep(start, end, direction.normalized().dot(center.normalized()))


def terrain_height(direction):
    n = direction.normalized()
    noise = (
        math.sin(n.x * 17.0 + n.y * 5.0) * 0.13
        + math.sin(n.y * 23.0 - n.z * 7.0) * 0.08
        + math.sin((n.x - n.y + n.z) * 39.0) * 0.045
    )

    height = noise
    for index, center in enumerate(HIMALAYA_CENTERS):
        broad = gaussian_direction(n, center, 0.925, 0.992)
        summit = gaussian_direction(n, center, 0.975, 0.999)
        height += broad * (1.05 + 0.18 * (index % 2))
        height += summit * summit * (2.4 + 0.45 * (index % 3))

    terrace = gaussian_direction(n, TERRACE_CENTER, 0.94, 0.992)
    height += terrace * 0.55

    lake = gaussian_direction(n, LAKE_CENTER, 0.972, 0.998)
    height -= lake * 0.92

    # The underside remains gently authored instead of becoming a featureless ball.
    underside = smoothstep(-0.95, 0.2, -n.z)
    height += underside * (math.sin(n.x * 11.0) + math.sin(n.y * 13.0)) * 0.075
    return height


def surface(direction, altitude=0.0):
    n = direction.normalized()
    return n * (RADIUS + terrain_height(n) + altitude)


def great_circle(a, b, t):
    a = a.normalized()
    b = b.normalized()
    dot = clamp(a.dot(b), -1.0, 1.0)
    angle = math.acos(dot)
    if angle < 0.0001:
        return a.copy()
    sin_angle = math.sin(angle)
    return (
        a * (math.sin((1.0 - t) * angle) / sin_angle)
        + b * (math.sin(t * angle) / sin_angle)
    ).normalized()


def angular_distance(a, b):
    return math.acos(clamp(a.normalized().dot(b.normalized()), -1.0, 1.0)) * RADIUS


def material(name, color, roughness=0.92, metallic=0.0):
    mat = bpy.data.materials.new("NimbuIndia_" + name)
    mat.diffuse_color = color
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat


MATS = {name: material(name, color) for name, color in COLORS.items()}
MATS["water"] = material("water", COLORS["water"], 0.28, 0.02)
MATS["water_light"] = material("water_light", COLORS["water_light"], 0.22, 0.01)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.curves,
        bpy.data.meshes,
        bpy.data.cameras,
        bpy.data.lights,
        bpy.data.collections,
    ):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def make_collection(name):
    result = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(result)
    return result


def move_to_collection(obj, target):
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    target.objects.link(obj)


def oriented_root(name, direction, altitude=0.0, preferred=Vector((0, 1, 0)), target=None):
    root = bpy.data.objects.new(name, None)
    (target or bpy.context.collection).objects.link(root)
    right, forward, up = tangent_basis(direction, preferred)
    root.rotation_mode = "QUATERNION"
    root.rotation_quaternion = Matrix((right, forward, up)).transposed().to_quaternion()
    root.location = surface(direction, altitude)
    root["surface_normal"] = tuple(round(value, 6) for value in direction.normalized())
    return root


def box(parent, name, location, dimensions, mat, bevel=0.04, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.parent = parent
    if parent and parent.users_collection:
        move_to_collection(obj, parent.users_collection[0])
    obj.location = location
    obj.rotation_euler = rotation
    obj.data.materials.append(mat)
    if bevel > 0:
        modifier = obj.modifiers.new("Soft illustrated edge", "BEVEL")
        modifier.width = bevel
        modifier.segments = 1
    return obj


def cylinder(parent, name, location, radius, depth, mat, vertices=8, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=(0, 0, 0),
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.parent = parent
    if parent and parent.users_collection:
        move_to_collection(obj, parent.users_collection[0])
    obj.location = location
    obj.data.materials.append(mat)
    return obj


def ico(parent, name, location, radius, mat, subdivisions=1, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=radius, location=(0, 0, 0))
    obj = bpy.context.object
    obj.name = name
    obj.parent = parent
    if parent and parent.users_collection:
        move_to_collection(obj, parent.users_collection[0])
    obj.location = location
    obj.scale = scale
    obj.data.materials.append(mat)
    return obj


def cone(parent, name, location, radius, depth, mat, vertices=7, radius_top=0.0):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius,
        radius2=radius_top,
        depth=depth,
        location=(0, 0, 0),
    )
    obj = bpy.context.object
    obj.name = name
    obj.parent = parent
    if parent and parent.users_collection:
        move_to_collection(obj, parent.users_collection[0])
    obj.location = location
    obj.data.materials.append(mat)
    return obj


def create_planet(target):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=5, radius=RADIUS, location=(0, 0, 0))
    planet = bpy.context.object
    planet.name = "BASE_Indian_Himalayan_Planet"
    move_to_collection(planet, target)
    planet["world_radius"] = RADIUS
    planet["world_style"] = "messenger-inspired-indian-himalaya"
    planet["milestone"] = "01-natural-foundation"

    terrain_materials = [
        MATS["grass"], MATS["grass_light"], MATS["grass_dark"], MATS["meadow"],
        MATS["earth"], MATS["stone"], MATS["stone_light"], MATS["snow"],
    ]
    for mat in terrain_materials:
        planet.data.materials.append(mat)

    for vertex in planet.data.vertices:
        direction = vertex.co.normalized()
        vertex.co = direction * (RADIUS + terrain_height(direction))

    for polygon in planet.data.polygons:
        center = sum((planet.data.vertices[index].co for index in polygon.vertices), Vector()) / len(polygon.vertices)
        direction = center.normalized()
        height = terrain_height(direction)
        forest = gaussian_direction(direction, FOREST_CENTER, 0.86, 0.985)
        terrace = gaussian_direction(direction, TERRACE_CENTER, 0.90, 0.985)
        variation = math.sin(direction.x * 51 + direction.y * 33 + direction.z * 29)
        if height > 3.25:
            index = 7
        elif height > 1.65:
            index = 6 if variation > -0.15 else 5
        elif forest > 0.45:
            index = 2
        elif terrace > 0.45:
            index = 3 if variation > -0.3 else 4
        elif variation > 0.55:
            index = 1
        else:
            index = 0
        polygon.material_index = index
        polygon.use_smooth = False
    return planet


def create_ribbon(name, directions, width, mat, altitude, target, closed=False, constant_radius=None):
    vertices = []
    faces = []
    count = len(directions)
    for index, direction in enumerate(directions):
        previous = directions[(index - 1) % count] if closed or index > 0 else directions[index]
        following = directions[(index + 1) % count] if closed or index < count - 1 else directions[index]
        tangent = (following - previous).normalized()
        right = tangent.cross(direction).normalized()
        for sign in (-1, 1):
            edge = (direction + right * (sign * width * 0.5 / RADIUS)).normalized()
            if constant_radius is None:
                point = surface(edge, altitude)
            else:
                point = edge * constant_radius
            vertices.append(point)
    segment_count = count if closed else count - 1
    for index in range(segment_count):
        next_index = (index + 1) % count
        faces.append((index * 2, index * 2 + 1, next_index * 2 + 1, next_index * 2))
    mesh = bpy.data.meshes.new(name + "_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    target.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def offset_path(directions, distance, closed=False):
    result = []
    for index, direction in enumerate(directions):
        previous = directions[(index - 1) % len(directions)] if closed else directions[max(0, index - 1)]
        following = directions[(index + 1) % len(directions)] if closed else directions[min(len(directions) - 1, index + 1)]
        tangent = (following - previous).normalized()
        right = tangent.cross(direction).normalized()
        result.append((direction + right * (distance / RADIUS)).normalized())
    return result


def create_disc(name, center, radius, mat, target, radial_steps=8, segments=72, level=None):
    vertices = []
    faces = []
    for ring in range(radial_steps + 1):
        ring_radius = radius * ring / radial_steps
        for segment in range(segments):
            angle = segment / segments * math.tau
            direction = direction_from_local(center, math.cos(angle) * ring_radius, math.sin(angle) * ring_radius)
            if level is None:
                point = surface(direction, 0.08)
            else:
                point = direction * level
            vertices.append(point)
    for ring in range(radial_steps):
        for segment in range(segments):
            next_segment = (segment + 1) % segments
            a = ring * segments + segment
            b = ring * segments + next_segment
            c = (ring + 1) * segments + next_segment
            d = (ring + 1) * segments + segment
            faces.append((a, b, c, d))
    mesh = bpy.data.meshes.new(name + "_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    target.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def path_clear(direction, reserved, margin=0.0):
    for route, half_width in reserved:
        if min(angular_distance(direction, point) for point in route) < half_width + margin:
            return False
    if angular_distance(direction, LAKE_CENTER) < 7.7 + margin:
        return False
    if angular_distance(direction, MANDIR_CENTER) < 3.6 + margin:
        return False
    return True


def create_peak(name, direction, radius, height, target):
    # Sink the broad tangent-plane base into the curved planet so peaks never float at their edges.
    root = oriented_root(name, direction, -0.72, target=target)
    segments = 9
    rings = (
        (0.0, 1.00, 0.00, 0.00),
        (0.30, 0.84, 0.08, -0.04),
        (0.57, 0.60, -0.06, 0.07),
        (0.79, 0.35, 0.05, -0.03),
        (1.00, 0.055, -0.02, 0.02),
    )
    vertices = []
    for ring_index, (height_ratio, radius_ratio, offset_x, offset_y) in enumerate(rings):
        for segment in range(segments):
            angle = segment / segments * math.tau
            irregularity = 1.0 + 0.12 * math.sin(segment * 2.7 + ring_index * 1.8)
            vertices.append((
                (math.cos(angle) * radius * radius_ratio * irregularity) + offset_x * radius,
                (math.sin(angle) * radius * radius_ratio * irregularity) + offset_y * radius,
                height * height_ratio,
            ))
    faces = []
    face_materials = []
    for ring_index in range(len(rings) - 1):
        for segment in range(segments):
            next_segment = (segment + 1) % segments
            faces.append((
                ring_index * segments + segment,
                ring_index * segments + next_segment,
                (ring_index + 1) * segments + next_segment,
                (ring_index + 1) * segments + segment,
            ))
            if ring_index >= 3:
                face_materials.append(2)
            elif ring_index == 2 and segment % 3 != 1:
                face_materials.append(2)
            else:
                face_materials.append(1 if segment % 3 == 0 else 0)
    faces.append(tuple(range(segments - 1, -1, -1)))
    face_materials.append(1)
    mesh = bpy.data.meshes.new(name + "_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    mountain = bpy.data.objects.new(name + "_faceted_mass", mesh)
    mountain.parent = root
    target.objects.link(mountain)
    mountain.data.materials.append(MATS["stone"])
    mountain.data.materials.append(MATS["stone_dark"])
    mountain.data.materials.append(MATS["snow"])
    for polygon, material_index in zip(mountain.data.polygons, face_materials):
        polygon.material_index = material_index
        polygon.use_smooth = False

    for index, (x, y, scale) in enumerate((
        (-0.62, -0.22, 0.36), (0.58, -0.18, 0.32), (-0.38, 0.34, 0.26),
    )):
        ico(
            root,
            f"{name}_foothill_{index}",
            (x * radius, y * radius, 0.20 * height * scale),
            radius * scale * 1.32,
            MATS["stone" if index % 2 else "stone_dark"],
            1,
            (1.25, 1.0, 1.35),
        )
    return root


def create_broadleaf(name, direction, scale, target, dark=False):
    root = oriented_root(name, direction, 0.03, target=target)
    cylinder(root, name + "_trunk", (0, 0, 0.82 * scale), 0.12 * scale, 1.64 * scale, MATS["trunk"], 7)
    crown = MATS["grass_dark"] if dark else MATS["grass_light"]
    ico(root, name + "_crown_a", (0, 0, 2.05 * scale), 0.92 * scale, crown, 1, (1.0, 0.9, 1.12))
    ico(root, name + "_crown_b", (-0.52 * scale, 0.05, 1.85 * scale), 0.63 * scale, crown, 1)
    ico(root, name + "_crown_c", (0.52 * scale, 0.02, 1.84 * scale), 0.62 * scale, crown, 1)
    return root


def create_conifer(name, direction, scale, target):
    root = oriented_root(name, direction, 0.03, target=target)
    cylinder(root, name + "_trunk", (0, 0, 0.88 * scale), 0.10 * scale, 1.76 * scale, MATS["trunk"], 7)
    cone(root, name + "_lower", (0, 0, 1.55 * scale), 0.76 * scale, 1.85 * scale, MATS["grass_dark"], 8)
    cone(root, name + "_upper", (0, 0, 2.55 * scale), 0.55 * scale, 1.75 * scale, MATS["grass"], 8)
    return root


def create_terraces(target):
    for index, radius in enumerate((3.3, 4.35, 5.45, 6.6, 7.8)):
        directions = []
        for step in range(76):
            angle = math.radians(-118 + step * (218 / 75))
            directions.append(direction_from_local(
                TERRACE_CENTER,
                math.cos(angle) * radius,
                math.sin(angle) * radius,
            ))
        mat = MATS["meadow"] if index % 2 == 0 else MATS["earth_light"]
        create_ribbon(f"LANDMARK_Terrace_{index:02d}", directions, 0.62, mat, 0.16, target)


def create_mandir(target):
    root = oriented_root("LANDMARK_Pahadi_Mandir", MANDIR_CENTER, 0.12, target=target)
    box(root, "Mandir_plinth", (0, 0, 0.18), (4.2, 3.4, 0.36), MATS["stone_light"], 0.06)
    box(root, "Mandir_step_1", (0, -2.0, 0.12), (2.4, 1.1, 0.24), MATS["stone_light"], 0.04)
    box(root, "Mandir_step_2", (0, -2.35, 0.05), (1.9, 0.75, 0.14), MATS["paper"], 0.03)
    for x in (-1.35, 1.35):
        for y in (-0.88, 0.88):
            cylinder(root, f"Mandir_column_{x}_{y}", (x, y, 1.75), 0.16, 2.75, MATS["paper"], 8)
    cone(root, "Mandir_roof", (0, 0, 3.34), 2.55, 1.18, MATS["paper"], 4, 0.62)
    cone(root, "Mandir_shikhara", (0, 0, 4.35), 0.78, 1.45, MATS["saffron"], 8, 0.08)
    ico(root, "Mandir_finial", (0, 0, 5.16), 0.18, MATS["gold"], 2, (1, 1, 1.35))
    return root


def create_player_marker(direction, target):
    root = oriented_root("RENDER_Player_scale_reference", direction, 0.12, target=target)
    ico(root, "Player_head", (0, 0, 2.18), 0.34, MATS["skin"], 2, (0.94, 0.92, 1.06))
    ico(root, "Player_hair", (0, 0.02, 2.42), 0.37, MATS["ink"], 2, (1, 0.92, 0.62))
    ico(root, "Player_torso", (0, 0, 1.43), 0.58, MATS["shirt"], 2, (0.72, 0.52, 1.08))
    ico(root, "Player_pants", (0, 0, 0.93), 0.44, MATS["pants"], 2, (0.84, 0.70, 0.76))
    for side in (-1, 1):
        cylinder(root, f"Player_arm_{side}", (side * 0.48, 0, 1.35), 0.10, 0.72, MATS["skin"], 8)
        cylinder(root, f"Player_leg_{side}", (side * 0.20, 0, 0.53), 0.14, 0.78, MATS["pants"], 8)
        box(root, f"Player_shoe_{side}", (side * 0.20, -0.10, 0.12), (0.36, 0.58, 0.23), MATS["gold"], 0.08)
    return root


def add_cloud(name, location, scale, target):
    root = bpy.data.objects.new(name, None)
    target.objects.link(root)
    root.location = location
    for index, (x, y, z, size) in enumerate((
        (-1.8, 0, 0, 1.6), (-0.6, 0, 0.35, 2.0), (0.9, 0, 0.22, 1.8), (2.1, 0, -0.05, 1.25),
    )):
        ico(root, f"{name}_{index}", (x * scale, y, z * scale), size * scale, MATS["cloud"], 2, (1.5, 0.42, 0.62))


def create_camera(name, location, target, lens):
    bpy.ops.object.camera_add(location=location)
    camera = bpy.context.object
    camera.name = name
    camera.data.lens = lens
    camera.data.sensor_width = 36
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()
    return camera


def configure_scene():
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_WORKBENCH_NEXT"
    except Exception:
        try:
            scene.render.engine = "BLENDER_WORKBENCH"
        except Exception:
            scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 1000
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world = scene.world or bpy.data.worlds.new("Nimbu turquoise world")
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = COLORS["sky"]
    background.inputs["Strength"].default_value = 0.65

    if scene.render.engine.startswith("BLENDER_WORKBENCH"):
        shading = scene.display.shading
        shading.light = "STUDIO"
        shading.studio_light = "paint.sl"
        shading.color_type = "MATERIAL"
        shading.show_shadows = True
        shading.show_cavity = True
        shading.cavity_type = "BOTH"
        shading.curvature_ridge_factor = 1.65
        shading.curvature_valley_factor = 1.15
        if hasattr(shading, "show_outline"):
            shading.show_outline = True
        if hasattr(shading, "outline_color"):
            shading.outline_color = COLORS["ink"][:3]
        shading.background_type = "VIEWPORT"
        shading.background_color = COLORS["sky"][:3]
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except Exception:
        pass


def create_routes(target):
    main_path = []
    for index in range(221):
        along = -28.0 + index * (40.0 / 220)
        across = math.sin(along * 0.18) * 1.65 - smoothstep(5.0, 12.0, along) * 1.8
        main_path.append(local_direction(across, along))
    create_ribbon("BASE_Clear_Walking_Path", main_path, 2.65, MATS["earth_light"], 0.14, target)
    create_ribbon("BASE_Walking_Path_Edge_L", offset_path(main_path, -1.30), 0.12, MATS["stone_dark"], 0.18, target)
    create_ribbon("BASE_Walking_Path_Edge_R", offset_path(main_path, 1.30), 0.12, MATS["stone_dark"], 0.18, target)

    mountain_start = main_path[-16]
    mountain_gap = local_direction(-2.0, 21.0)
    mountain_path = []
    for index in range(101):
        t = index / 100
        direction = great_circle(mountain_start, mountain_gap, t)
        right, _, _ = tangent_basis(direction)
        direction = (direction + right * (math.sin(t * math.pi * 3.0) * math.sin(t * math.pi) * 0.025)).normalized()
        mountain_path.append(direction)
    create_ribbon("BASE_Clear_Mountain_Trail", mountain_path, 1.75, MATS["earth"], 0.16, target)

    # The Messenger-like globe needs one readable route that visibly wraps around
    # the planet. This is a walking belt now and a future inter-city road socket.
    ring_path = []
    ring_latitude = math.radians(43.5)
    for index in range(240):
        angle = index / 240 * math.tau
        ring_path.append(Vector((
            math.cos(ring_latitude) * math.cos(angle),
            math.cos(ring_latitude) * math.sin(angle),
            math.sin(ring_latitude),
        )).normalized())
    create_ribbon("BASE_Clear_World_Ring_Path", ring_path, 2.40, MATS["earth_light"], 0.15, target, True)
    create_ribbon("BASE_World_Ring_Edge_Outer", offset_path(ring_path, -1.18, True), 0.10, MATS["stone_dark"], 0.19, target, True)
    create_ribbon("BASE_World_Ring_Edge_Inner", offset_path(ring_path, 1.18, True), 0.10, MATS["stone_dark"], 0.19, target, True)

    lakeside_path = []
    for index in range(111):
        angle = math.radians(205 + index * (245 / 110))
        radius = 7.4
        lakeside_path.append(direction_from_local(
            LAKE_CENTER,
            math.cos(angle) * radius,
            math.sin(angle) * radius,
        ))
    create_ribbon("BASE_Clear_Lakeside_Path", lakeside_path, 1.55, MATS["earth_light"], 0.15, target)
    return [
        (main_path, 2.6),
        (mountain_path, 2.1),
        (ring_path, 2.35),
        (lakeside_path, 1.9),
    ]


def create_natural_landmarks(target):
    # A shared radial level makes the lake a clean spherical water plane instead of
    # allowing high terrain triangles to pierce it.
    lake_level = RADIUS + 0.18
    create_disc("LANDMARK_Neel_Taal_Shore", LAKE_CENTER, 7.2, MATS["stone_light"], target, 8, 72, lake_level - 0.08)
    create_disc("LANDMARK_Neel_Taal_Water", LAKE_CENTER, 6.55, MATS["water"], target, 9, 84, lake_level)

    river_start = local_direction(0.2, 22.5)
    river = []
    for index in range(121):
        t = index / 120
        direction = great_circle(river_start, direction_from_local(LAKE_CENTER, -2.4, 4.2), t)
        right, _, _ = tangent_basis(direction)
        direction = (direction + right * (math.sin(t * math.tau * 2.2) * math.sin(t * math.pi) * 0.023)).normalized()
        river.append(direction)
    create_ribbon("LANDMARK_River_Stone_Bank", river, 2.15, MATS["stone_light"], 0.32, target)
    create_ribbon("LANDMARK_River_Water", river, 1.22, MATS["water_light"], 0.40, target)

    create_terraces(target)
    create_mandir(target)


def create_environment(target, reserved):
    peak_specs = [
        (-24.0, 19.5, 4.7, 7.4),
        (-17.0, 24.5, 5.5, 9.3),
        (-8.7, 27.5, 6.0, 10.7),
        (0.2, 29.3, 6.3, 11.5),
        (9.2, 27.0, 5.8, 10.3),
        (17.7, 23.5, 5.2, 9.0),
        (24.0, 18.2, 4.5, 7.5),
    ]
    for index, (x, y, radius, height) in enumerate(peak_specs):
        create_peak(f"LANDMARK_Himalaya_Peak_{index:02d}", local_direction(x, y), radius, height, target)

    tree_directions = []
    attempts = 0
    while len(tree_directions) < 220 and attempts < 2400:
        attempts += 1
        angle = random.random() * math.tau
        z = random.uniform(0.18, 0.96)
        radial = math.sqrt(max(0.0, 1.0 - z * z))
        direction = Vector((math.cos(angle) * radial, math.sin(angle) * radial, z)).normalized()
        if direction.z < 0.18:
            continue
        if not path_clear(direction, reserved, 0.9):
            continue
        if any(angular_distance(direction, peak) < 3.8 for peak in HIMALAYA_CENTERS):
            continue
        if any(angular_distance(direction, other) < 1.22 for other in tree_directions):
            continue
        tree_directions.append(direction)

    for index, direction in enumerate(tree_directions):
        mountain_bias = max(direction.dot(center) for center in HIMALAYA_CENTERS)
        scale = random.uniform(0.72, 1.28)
        if mountain_bias > 0.93 or index % 5 == 0:
            create_conifer(f"ENV_Deodar_{index:03d}", direction, scale, target)
        else:
            create_broadleaf(f"ENV_Broadleaf_{index:03d}", direction, scale, target, index % 4 == 0)

    # Sparse rocks articulate the surface without blocking the travel corridors.
    rock_count = 0
    for index in range(120):
        theta = index * 2.399963
        z = 1.0 - 2.0 * ((index + 0.5) / 120)
        radial = math.sqrt(max(0.0, 1.0 - z * z))
        direction = Vector((math.cos(theta) * radial, math.sin(theta) * radial, z)).normalized()
        if direction.z > 0.72 and not path_clear(direction, reserved, 0.35):
            continue
        root = oriented_root(f"ENV_Rock_{rock_count:03d}", direction, 0.02, target=target)
        size = random.uniform(0.18, 0.46)
        ico(root, f"ENV_Rock_mesh_{rock_count:03d}", (0, 0, size * 0.42), size, MATS["stone"], 1, (1.4, 0.92, 0.72))
        rock_count += 1

    return len(tree_directions), rock_count


def create_sockets(target):
    socket_specs = {
        "SOCKET_Player_Start": local_direction(0.0, -23.5),
        "SOCKET_Lower_City": local_direction(-3.0, -13.0),
        "SOCKET_Lake_Town": direction_from_local(LAKE_CENTER, -8.7, -1.5),
        "SOCKET_Mountain_City": local_direction(0.0, 20.0),
        "SOCKET_Future_Rail_West": local_direction(-28.0, 9.0),
        "SOCKET_Future_Rail_East": local_direction(28.0, 10.0),
    }
    for name, direction in socket_specs.items():
        root = oriented_root(name, direction, 0.16, target=target)
        root["socket_type"] = name.replace("SOCKET_", "").lower()
    return socket_specs


def build():
    clear_scene()
    export = make_collection("EXPORT_NIMBU_INDIA_PLANET_BASE")
    render_only = make_collection("RENDER_ONLY")
    create_planet(export)
    reserved = create_routes(export)
    create_natural_landmarks(export)
    tree_count, rock_count = create_environment(export, reserved)
    sockets = create_sockets(export)

    # The render preview sits farther into the valley so the first review shows
    # the landscape language; the actual gameplay spawn remains a separate socket.
    player_direction = local_direction(0.0, -5.5)
    create_player_marker(player_direction, render_only)

    configure_scene()

    overview_camera = create_camera(
        "CAMERA_Planet_Overview",
        Vector((65, -86, 192)),
        Vector((0, 3.0, 2.5)),
        50,
    )

    right, forward, up = tangent_basis(player_direction, Vector((0, 1, 0)))
    player_surface = surface(player_direction, 0.10)
    gameplay_camera = create_camera(
        "CAMERA_Gameplay",
        player_surface + up * 6.1 - forward * 13.5 + right * 0.45,
        player_surface + up * 1.35 + forward * 14.5,
        50,
    )

    scene = bpy.context.scene
    scene.camera = overview_camera
    scene.render.filepath = os.path.join(OUTPUT_DIR, "nimbu_india_planet_base_overview.png")
    bpy.ops.render.render(write_still=True)
    scene.camera = gameplay_camera
    scene.render.filepath = os.path.join(OUTPUT_DIR, "nimbu_india_planet_base_gameplay.png")
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

    route_samples = sum(len(route) for route, _ in reserved)
    report = {
        "milestone": "01-natural-foundation",
        "world_radius": RADIUS,
        "is_true_sphere": True,
        "tree_count": tree_count,
        "rock_count": rock_count,
        "route_samples": route_samples,
        "route_count": len(reserved),
        "socket_count": len(sockets),
        "exports": {
            "blend": BLEND_PATH,
            "glb": GLB_PATH,
        },
    }
    with open(REPORT_PATH, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)
    print("NIMBU_INDIA_PLANET_BASE_COMPLETE", json.dumps(report))


if __name__ == "__main__":
    build()
