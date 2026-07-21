import bpy
import math
import os
from mathutils import Vector, Matrix


ROOT = "/Users/rehaanr/Documents/openai"
BLEND_PATH = os.path.join(ROOT, "blender", "nimbu_messenger_clean_master.blend")
RENDER_PATH = os.path.join(ROOT, "blender", "output", "nimbu_messenger_clean.png")
GLB_PATH = os.path.join(ROOT, "public", "assets", "nimbu_messenger_clean.glb")
RADIUS = 30.0

os.makedirs(os.path.dirname(RENDER_PATH), exist_ok=True)
os.makedirs(os.path.dirname(GLB_PATH), exist_ok=True)


COLORS = {
    "clay": (0.88, 0.88, 0.86, 1),
    "clay_dark": (0.66, 0.67, 0.65, 1),
    "road": (0.64, 0.67, 0.66, 1),
    "curb": (0.81, 0.81, 0.78, 1),
    "glass": (0.59, 0.63, 0.63, 1),
    "ink": (0.24, 0.25, 0.25, 1),
    "background": (0.98, 0.98, 0.97, 1),
}


def material(name, color, roughness=0.92):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


MATS = {name: material("Messenger_" + name, color) for name, color in COLORS.items()}


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.curves, bpy.data.meshes, bpy.data.cameras, bpy.data.lights):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def make_collection(name):
    result = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(result)
    return result


def move_to_collection(obj, target):
    for current in list(obj.users_collection):
        current.objects.unlink(obj)
    target.objects.link(obj)


def smoothstep(a, b, value):
    t = max(0.0, min(1.0, (value - a) / (b - a)))
    return t * t * (3.0 - 2.0 * t)


def terrain_height(direction):
    n = direction.normalized()
    low_undulation = math.sin(n.x * 9.0 + n.y * 5.0) * 0.08 + math.sin(n.y * 13.0) * 0.05
    left_ridge = Vector((-0.34, 0.30, 0.89)).normalized()
    right_ridge = Vector((0.43, 0.36, 0.83)).normalized()
    left = smoothstep(0.88, 0.985, n.dot(left_ridge)) * 1.45
    right = smoothstep(0.90, 0.988, n.dot(right_ridge)) * 1.05
    town_flatten = smoothstep(0.93, 0.995, n.z)
    return (low_undulation + left + right) * (1.0 - town_flatten * 0.78)


def surface(direction, altitude=0.0):
    n = direction.normalized()
    return n * (RADIUS + terrain_height(n) + altitude)


def tangent_basis(direction, preferred=Vector((0, 1, 0))):
    up = direction.normalized()
    forward = preferred - up * preferred.dot(up)
    if forward.length < 0.001:
        forward = Vector((1, 0, 0)) - up * up.x
    forward.normalize()
    right = forward.cross(up).normalized()
    return right, forward, up


def local_direction(x, y, center=Vector((0, 0, 1))):
    right, forward, up = tangent_basis(center)
    return (up + right * (x / RADIUS) + forward * (y / RADIUS)).normalized()


def oriented_root(name, direction, altitude=0.0, preferred=Vector((0, 1, 0)), target=None):
    root = bpy.data.objects.new(name, None)
    (target or bpy.context.collection).objects.link(root)
    right, forward, up = tangent_basis(direction, preferred)
    root.rotation_mode = "QUATERNION"
    root.rotation_quaternion = Matrix((right, forward, up)).transposed().to_quaternion()
    root.location = surface(direction, altitude)
    return root


def box(parent, name, location, dimensions, mat, bevel=0.025, rotation=(0, 0, 0)):
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
    if bevel:
        modifier = obj.modifiers.new("Barely softened manufactured edge", "BEVEL")
        modifier.width = bevel
        modifier.segments = 1
    return obj


def cylinder(parent, name, location, radius, depth, mat, vertices=10, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=(0, 0, 0), rotation=rotation)
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


def create_planet(target):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=5, radius=RADIUS, location=(0, 0, 0))
    planet = bpy.context.object
    planet.name = "Messenger_clean_spherical_world"
    move_to_collection(planet, target)
    for vertex in planet.data.vertices:
        direction = vertex.co.normalized()
        vertex.co = direction * (RADIUS + terrain_height(direction))
    planet.data.materials.append(MATS["clay"])
    for polygon in planet.data.polygons:
        polygon.use_smooth = True
    return planet


def create_ribbon(name, directions, width, mat, altitude, target):
    vertices = []
    faces = []
    for index, direction in enumerate(directions):
        previous = directions[max(0, index - 1)]
        following = directions[min(len(directions) - 1, index + 1)]
        tangent = (following - previous).normalized()
        right = tangent.cross(direction).normalized()
        for sign in (-1, 1):
            edge = (direction + right * (sign * width * 0.5 / RADIUS)).normalized()
            vertices.append(surface(edge, altitude))
    for index in range(len(directions) - 1):
        a = index * 2
        faces.append((a, a + 1, a + 3, a + 2))
    mesh = bpy.data.meshes.new(name + "_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    target.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def road_directions():
    result = []
    for index in range(181):
        y = -12 + index * (34 / 180)
        x = math.sin(y * 0.18) * 0.75 + smoothstep(10, 22, y) * 1.0
        result.append(local_direction(x, y))
    return result


def offset_path(directions, distance):
    result = []
    for index, direction in enumerate(directions):
        previous = directions[max(0, index - 1)]
        following = directions[min(len(directions) - 1, index + 1)]
        tangent = (following - previous).normalized()
        right = tangent.cross(direction).normalized()
        result.append((direction + right * (distance / RADIUS)).normalized())
    return result


def create_railing(name, x, start_y, end_y, preferred, target):
    spacing = 1.15
    count = int((end_y - start_y) / spacing) + 1
    points = []
    for index in range(count):
        y = start_y + (end_y - start_y) * index / max(1, count - 1)
        direction = local_direction(x, y)
        points.append(direction)
        root = oriented_root(f"{name}_post_{index}", direction, 0.14, preferred, target)
        box(root, f"{name}_post_mesh_{index}", (0, 0, 0.72), (0.09, 0.09, 1.44), MATS["clay_dark"], 0.012)
    for rail_height in (0.55, 1.08):
        for index in range(len(points) - 1):
            start = surface(points[index], 0.14 + rail_height)
            end = surface(points[index + 1], 0.14 + rail_height)
            midpoint = (start + end) * 0.5
            length = (end - start).length
            root = bpy.data.objects.new(f"{name}_rail_root_{rail_height}_{index}", None)
            target.objects.link(root)
            root.location = midpoint
            root.rotation_mode = "QUATERNION"
            root.rotation_quaternion = (end - start).to_track_quat("Y", "Z")
            box(root, f"{name}_rail_{rail_height}_{index}", (0, 0, 0), (0.075, length, 0.075), MATS["clay_dark"], 0.01)


def create_building(name, x, y, width, depth, height, preferred, target, balcony=False):
    direction = local_direction(x, y)
    root = oriented_root(name, direction, 0.06, preferred, target)
    box(root, name + "_body", (0, 0, height * 0.5), (width, depth, height), MATS["clay"], 0.035)
    box(root, name + "_roof_slab", (0, 0, height + 0.10), (width + 0.22, depth + 0.22, 0.20), MATS["curb"], 0.018)
    front_y = -depth * 0.515
    for floor in range(max(1, int(height / 1.3))):
        z = 0.78 + floor * 1.25
        if z > height - 0.25:
            continue
        for window_index in (-1, 1):
            wx = window_index * width * 0.25
            box(root, f"{name}_window_{floor}_{window_index}", (wx, front_y, z), (0.58, 0.08, 0.64), MATS["glass"], 0.018)
    box(root, name + "_door", (0, front_y - 0.01, 0.63), (0.65, 0.10, 1.18), MATS["clay_dark"], 0.025)
    box(root, name + "_pipe", (width * 0.44, front_y - 0.03, height * 0.50), (0.09, 0.09, height * 0.92), MATS["clay_dark"], 0.012)
    if balcony:
        box(root, name + "_balcony_slab", (0, front_y - 0.34, 1.55), (width * 0.82, 0.76, 0.13), MATS["curb"], 0.018)
        box(root, name + "_balcony_top", (0, front_y - 0.68, 2.10), (width * 0.82, 0.06, 0.06), MATS["clay_dark"], 0.008)
        for bar_index in range(9):
            bx = -width * 0.34 + bar_index * width * 0.085
            box(root, name + f"_balcony_bar_{bar_index}", (bx, front_y - 0.68, 1.82), (0.035, 0.035, 0.56), MATS["clay_dark"], 0.006)
    return root


def create_billboard(target):
    direction = local_direction(6.5, 3.0)
    root = oriented_root("Roadside_billboard", direction, 0.14, Vector((1, 0, 0)), target)
    box(root, "Billboard_panel", (0, 0, 2.25), (4.3, 0.20, 2.7), MATS["clay"], 0.025)
    box(root, "Billboard_inner", (0, -0.12, 2.25), (3.88, 0.045, 2.28), MATS["background"], 0.01)
    for x in (-1.62, 1.62):
        box(root, f"Billboard_post_{x}", (x, 0.05, 0.92), (0.11, 0.11, 1.84), MATS["clay_dark"], 0.012)


def create_pole(name, x, y, target):
    direction = local_direction(x, y)
    root = oriented_root(name, direction, 0.08, target=target)
    cylinder(root, name + "_shaft", (0, 0, 2.9), 0.10, 5.8, MATS["clay_dark"], 10)
    box(root, name + "_crossbar", (0, 0, 5.15), (1.35, 0.10, 0.10), MATS["clay_dark"], 0.012)
    return direction


def create_wire(name, start_direction, end_direction, target):
    start = surface(start_direction, 5.18)
    end = surface(end_direction, 5.18)
    curve = bpy.data.curves.new(name + "_curve", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = 0.018
    curve.bevel_resolution = 0
    spline = curve.splines.new("POLY")
    spline.points.add(12)
    for index in range(13):
        t = index / 12
        point = start.lerp(end, t)
        point -= point.normalized() * (math.sin(t * math.pi) * 0.36)
        spline.points[index].co = (*point, 1)
    obj = bpy.data.objects.new(name, curve)
    target.objects.link(obj)
    obj.data.materials.append(MATS["ink"])


def create_conifer(name, x, y, scale, target):
    direction = local_direction(x, y)
    root = oriented_root(name, direction, 0.02, target=target)
    cylinder(root, name + "_trunk", (0, 0, 1.2 * scale), 0.095 * scale, 2.4 * scale, MATS["clay_dark"], 8)
    vertices = [
        (0, 0, 5.2 * scale),
        (-0.65 * scale, 0, 3.55 * scale), (0.65 * scale, 0, 3.55 * scale),
        (-0.82 * scale, 0, 2.55 * scale), (0.82 * scale, 0, 2.55 * scale),
        (-0.55 * scale, 0, 1.55 * scale), (0.55 * scale, 0, 1.55 * scale),
    ]
    faces = [(0, 1, 2), (1, 3, 2), (2, 3, 4), (3, 5, 4), (4, 5, 6)]
    for depth, offset in ((0.16, 0), (-0.16, 0.08)):
        mesh = bpy.data.meshes.new(name + f"_foliage_mesh_{depth}")
        mesh.from_pydata([(vx, depth, vz + offset) for vx, _, vz in vertices], [], faces)
        mesh.update()
        foliage = bpy.data.objects.new(name + f"_foliage_{depth}", mesh)
        foliage.parent = root
        foliage.data.materials.append(MATS["clay"])
        target.objects.link(foliage)


def create_rock(name, x, y, scale, target):
    direction = local_direction(x, y)
    root = oriented_root(name, direction, 0.03, target=target)
    ico(root, name + "_mesh", (0, 0, 0.25 * scale), 0.50 * scale, MATS["clay_dark"], 1, (1.4, 0.88, 0.65))


def create_mannequin(target):
    direction = local_direction(0, -4.7)
    root = oriented_root("Player_clean_mannequin", direction, 0.10, Vector((0, 1, 0)), target)
    clay = MATS["clay"]
    dark = MATS["clay_dark"]
    cylinder(root, "Player_torso", (0, 0, 1.35), 0.30, 0.72, clay, 10)
    ico(root, "Player_chest", (0, 0, 1.62), 0.34, clay, 2, (1.15, 0.72, 0.82))
    ico(root, "Player_pelvis", (0, 0, 0.96), 0.30, clay, 2, (1.08, 0.82, 0.72))
    cylinder(root, "Player_neck", (0, 0, 1.98), 0.10, 0.25, dark, 10)
    ico(root, "Player_head", (0, 0, 2.30), 0.29, clay, 2, (0.92, 0.88, 1.05))
    for side in (-1, 1):
        x = side * 0.38
        ico(root, f"Player_shoulder_{side}", (x, 0, 1.68), 0.13, clay, 2)
        cylinder(root, f"Player_upper_arm_{side}", (x, 0, 1.40), 0.085, 0.45, clay, 10)
        ico(root, f"Player_elbow_{side}", (x, 0, 1.15), 0.09, dark, 2)
        cylinder(root, f"Player_forearm_{side}", (x, 0, 0.94), 0.075, 0.38, clay, 10)
        ico(root, f"Player_hand_{side}", (x, 0, 0.70), 0.085, dark, 2)
        leg_x = side * 0.19
        cylinder(root, f"Player_thigh_{side}", (leg_x, 0, 0.62), 0.12, 0.48, clay, 10)
        ico(root, f"Player_knee_{side}", (leg_x, 0, 0.35), 0.10, dark, 2)
        cylinder(root, f"Player_shin_{side}", (leg_x, 0, 0.14), 0.10, 0.36, clay, 10)
        box(root, f"Player_foot_{side}", (leg_x, -0.08, -0.06), (0.24, 0.38, 0.16), clay, 0.04)
    return direction


def point_at(obj, target):
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def configure_scene():
    scene = bpy.context.scene
    # Messenger's clay-development look is closest to Blender's studio workbench:
    # clean material blocks, ambient contact shading, and a uniform graphite outline.
    try:
        scene.render.engine = "BLENDER_WORKBENCH_NEXT"
    except Exception:
        try:
            scene.render.engine = "BLENDER_WORKBENCH"
        except Exception:
            scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 1440
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    if scene.render.engine.startswith("BLENDER_WORKBENCH"):
        scene.display.shading.light = "STUDIO"
        scene.display.shading.studio_light = "paint.sl"
        scene.display.shading.color_type = "MATERIAL"
        scene.display.shading.show_shadows = True
        scene.display.shading.show_cavity = True
        scene.display.shading.cavity_type = "BOTH"
        scene.display.shading.curvature_ridge_factor = 1.55
        scene.display.shading.curvature_valley_factor = 1.15
        if hasattr(scene.display.shading, "show_outline"):
            scene.display.shading.show_outline = True
        if hasattr(scene.display.shading, "outline_color"):
            scene.display.shading.outline_color = (0.34, 0.35, 0.35)
        scene.display.shading.background_type = "VIEWPORT"
        scene.display.shading.background_color = COLORS["background"][:3]
    scene.world = scene.world or bpy.data.worlds.new("Messenger white world")
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = COLORS["background"]
    background.inputs["Strength"].default_value = 0.46
    try:
        scene.render.use_freestyle = True
        scene.render.line_thickness = 1.05
        lineset = bpy.context.view_layer.freestyle_settings.linesets[0]
        lineset.select_silhouette = True
        lineset.select_border = True
        lineset.select_crease = True
        lineset.select_external_contour = True
        linestyle = lineset.linestyle
        linestyle.color = (0.34, 0.35, 0.35)
        linestyle.thickness = 1.05
    except Exception:
        pass
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except Exception:
        pass


def build():
    clear_scene()
    export = make_collection("EXPORT_MESSENGER_CLEAN")
    create_planet(export)

    road = road_directions()
    create_ribbon("Clean_main_road", road, 6.0, MATS["road"], 0.075, export)
    create_ribbon("Clean_left_sidewalk", offset_path(road, -4.2), 2.0, MATS["curb"], 0.15, export)
    create_ribbon("Clean_right_sidewalk", offset_path(road, 4.2), 2.0, MATS["curb"], 0.15, export)
    create_ribbon("Clean_left_curb", offset_path(road, -3.12), 0.22, MATS["clay_dark"], 0.22, export)
    create_ribbon("Clean_right_curb", offset_path(road, 3.12), 0.22, MATS["clay_dark"], 0.22, export)

    create_railing("Left_guardrail", -5.25, 0.0, 10.5, Vector((-1, 0, 0)), export)
    create_railing("Right_guardrail", 5.25, 1.0, 12.5, Vector((1, 0, 0)), export)

    # Restrained architecture: large readable masses, never piles of primitives.
    create_building("Left_house_low", -7.2, 10.0, 5.6, 4.2, 3.6, Vector((-1, 0, 0)), export, True)
    create_building("Right_house_main", 8.0, 12.8, 6.2, 4.5, 5.2, Vector((1, 0, 0)), export, True)
    create_building("Right_house_near", 7.7, -4.0, 5.6, 4.1, 4.4, Vector((1, 0, 0)), export, False)
    create_building("Hill_house_far", -5.8, 18.0, 5.0, 3.8, 4.0, Vector((-1, 0, 0)), export, False)

    create_billboard(export)

    poles = [
        create_pole("Pole_near_left", -6.0, -2.5, export),
        create_pole("Pole_mid_right", 6.8, 7.5, export),
        create_pole("Pole_far_left", -5.5, 16.5, export),
    ]
    create_wire("Wire_near_to_mid", poles[0], poles[1], export)
    create_wire("Wire_mid_to_far", poles[1], poles[2], export)

    for index, (x, y, scale) in enumerate((
        (8.5, 2.4, 1.05), (10.0, 4.5, 1.20), (8.7, 7.2, 1.10),
        (11.0, 9.4, 1.25), (7.8, 15.2, 1.12), (-10.0, 12.2, 0.9),
    )):
        create_conifer(f"Clean_tree_{index}", x, y, scale, export)

    for index, (x, y, scale) in enumerate(((-7.8, -6.2, 0.85), (-9.0, -2.0, 0.55), (-7.1, 4.8, 0.5))):
        create_rock(f"Roadside_rock_{index}", x, y, scale, export)

    player_direction = create_mannequin(export)

    # Light is deliberately simple: white clay, fine line, soft directional shadow.
    bpy.ops.object.light_add(type="SUN", location=(12, -18, 30))
    sun = bpy.context.object
    sun.name = "Messenger_soft_sun"
    sun.data.energy = 2.1
    sun.data.color = (1.0, 0.97, 0.92)
    sun.data.angle = math.radians(9)
    sun.rotation_euler = (math.radians(29), math.radians(-22), math.radians(-32))

    bpy.ops.object.light_add(type="AREA", location=(-13, -12, 26))
    fill = bpy.context.object
    fill.name = "Messenger_large_fill"
    fill.data.energy = 210
    fill.data.shape = "DISK"
    fill.data.size = 18
    point_at(fill, Vector((0, 5, 24)))

    configure_scene()

    player_surface = surface(player_direction, 0.10)
    right, forward, up = tangent_basis(player_direction, Vector((0, 1, 0)))
    camera_location = player_surface + up * 3.65 - forward * 8.8 + right * 0.48
    camera_target = player_surface + up * 1.52 + forward * 8.5
    bpy.ops.object.camera_add(location=camera_location)
    camera = bpy.context.object
    camera.name = "Messenger_gameplay_camera"
    camera.data.lens = 48
    point_at(camera, camera_target)
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
    print("NIMBU_MESSENGER_CLEAN_COMPLETE", BLEND_PATH, GLB_PATH)


build()
