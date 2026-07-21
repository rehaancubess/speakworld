import bpy
import math
import os
import sys
from mathutils import Vector


ROOT = "/Users/rehaanr/Documents/openai"
BLENDER_DIR = os.path.join(ROOT, "blender")
if BLENDER_DIR not in sys.path:
    sys.path.insert(0, BLENDER_DIR)

import nimbu_exact_hilltown_builder as world


BLEND_PATH = os.path.join(BLENDER_DIR, "nimbu_3d_foundation_master.blend")
GLB_PATH = os.path.join(ROOT, "public", "assets", "nimbu_3d_foundation.glb")
OVERVIEW_PATH = os.path.join(BLENDER_DIR, "output", "nimbu_3d_foundation_overview.png")
GROUND_PATH = os.path.join(BLENDER_DIR, "output", "nimbu_3d_foundation_ground.png")
RAIL_PATH = os.path.join(BLENDER_DIR, "output", "nimbu_3d_foundation_rail.png")


def remove_hierarchy(parent):
    descendants = []
    stack = list(parent.children)
    while stack:
        child = stack.pop()
        stack.extend(list(child.children))
        descendants.append(child)
    for child in reversed(descendants):
        bpy.data.objects.remove(child, do_unlink=True)
    bpy.data.objects.remove(parent, do_unlink=True)


def point_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def configure_foundation_render():
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except Exception:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1536
    scene.render.resolution_y = 1024
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world = scene.world or bpy.data.worlds.new("Nimbu 3D foundation world")
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = world.PALETTE["sky"]
    background.inputs["Strength"].default_value = 0.66
    scene.render.use_freestyle = True
    scene.render.line_thickness = 1.05
    lineset = bpy.context.view_layer.freestyle_settings.linesets[0]
    lineset.select_silhouette = True
    lineset.select_border = True
    lineset.select_crease = False
    lineset.select_external_contour = True
    lineset.select_material_boundary = False
    lineset.linestyle.color = world.PALETTE["ink"][:3]
    lineset.linestyle.thickness = 1.05
    lineset.linestyle.alpha = 0.82
    try:
        scene.view_settings.view_transform = "Standard"
        scene.view_settings.look = "Medium High Contrast"
    except Exception:
        pass


def add_lighting():
    bpy.ops.object.light_add(type="SUN", location=(-25, -35, 75))
    sun = bpy.context.object
    sun.name = "Foundation_sun"
    sun.data.energy = 2.15
    sun.data.color = (1.0, 0.80, 0.57)
    sun.data.angle = math.radians(8)
    sun.rotation_euler = (math.radians(32), math.radians(-24), math.radians(-38))
    bpy.ops.object.light_add(type="AREA", location=(15, -45, 65))
    fill = bpy.context.object
    fill.name = "Foundation_fill"
    fill.data.energy = 760
    fill.data.shape = "DISK"
    fill.data.size = 65
    point_at(fill, (0, 78, 3))


def render_camera(name, location, target, scale, filepath):
    bpy.ops.object.camera_add(location=location)
    camera = bpy.context.object
    camera.name = name
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = scale
    camera.data.clip_start = 0.1
    camera.data.clip_end = 650.0
    point_at(camera, target)
    bpy.context.scene.camera = camera
    bpy.context.scene.render.filepath = filepath
    bpy.ops.render.render(write_still=True)
    return camera


def build():
    world.clear_scene()
    mats = {name: world.material("Foundation_" + name, color) for name, color in world.PALETTE.items()}
    export = world.make_collection("EXPORT_NIMBU_3D_FOUNDATION")

    # Real horizontal world-space meshes. Nothing here is a camera card or a
    # displaced illustration plane.
    world.create_reference_island(export, mats)
    world.create_reference_landforms(export, mats)
    world.create_true_himalayan_range(export, mats)
    world.create_reference_terraces(export, mats)
    world.create_reference_water_system(export, mats)
    world.create_reference_road_network(export, mats)
    world.create_railway_and_train(export, mats)
    train = bpy.data.objects.get("TOY_TRAIN")
    if train:
        remove_hierarchy(train)
    world.create_reference_vegetation(export, mats)

    # Keep the railway contract for the later moving train, but this visual
    # foundation contains only its physical route and infrastructure.
    world.validate_main_walking_path(export)
    world.optimize_web_scene(export)
    configure_foundation_render()
    add_lighting()

    # A GTA-style overview proves the full horizontal layout and elevation.
    overview = render_camera(
        "FOUNDATION_OVERVIEW_CAMERA",
        (158.0, -208.0, 158.0),
        (0.0, 78.0, 3.8),
        225.0,
        OVERVIEW_PATH,
    )

    # Ground camera shows that hills, roads, and the distant railway exist in
    # depth instead of being baked into a single image.
    ground = render_camera(
        "FOUNDATION_GROUND_CAMERA",
        (-52.0, -55.0, 27.0),
        (-10.0, 55.0, 4.0),
        96.0,
        GROUND_PATH,
    )
    ground.data.type = "PERSP"
    ground.data.lens = 52
    bpy.context.scene.camera = ground
    bpy.context.scene.render.filepath = GROUND_PATH
    bpy.ops.render.render(write_still=True)

    rail = render_camera(
        "FOUNDATION_RAIL_CAMERA",
        (112.0, 38.0, 72.0),
        (20.0, 145.0, 5.0),
        108.0,
        RAIL_PATH,
    )
    rail.data.type = "PERSP"
    rail.data.lens = 58
    bpy.context.scene.camera = rail
    bpy.context.scene.render.filepath = RAIL_PATH
    bpy.ops.render.render(write_still=True)

    bpy.context.scene.camera = overview
    bpy.context.scene.render.filepath = OVERVIEW_PATH
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
    print("NIMBU TRUE 3D FOUNDATION COMPLETE", BLEND_PATH, GLB_PATH)


build()
