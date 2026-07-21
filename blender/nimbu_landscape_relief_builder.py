import bpy
import math
import os
from mathutils import Vector


ROOT = "/Users/rehaanr/Documents/openai"
DEPTH_PATH = "/Users/rehaanr/Downloads/tmpnh02xaqy.png"
PLATE_PATH = os.path.join(ROOT, "public", "assets", "reference", "nimbu-landscape-clean-plate.png")
BLEND_PATH = os.path.join(ROOT, "blender", "nimbu_landscape_relief_master.blend")
GLB_PATH = os.path.join(ROOT, "public", "assets", "nimbu_landscape_relief.glb")
FRONT_RENDER_PATH = os.path.join(ROOT, "blender", "output", "nimbu_landscape_relief_front.png")
PARALLAX_RENDER_PATH = os.path.join(ROOT, "blender", "output", "nimbu_landscape_relief_parallax.png")

GRID_X = 256
GRID_Y = 171
RELIEF_WIDTH = 180.0
RELIEF_HEIGHT = 120.0
RELIEF_DEPTH = 34.0


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for blocks in (bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for block in list(blocks):
            if block.users == 0:
                blocks.remove(block)


def sample_depth():
    image = bpy.data.images.load(DEPTH_PATH, check_existing=True)
    width, height = image.size
    pixels = image.pixels
    values = []
    for row in range(GRID_Y):
        py = round(row / (GRID_Y - 1) * (height - 1))
        line = []
        for column in range(GRID_X):
            px = round(column / (GRID_X - 1) * (width - 1))
            line.append(float(pixels[(py * width + px) * 4]))
        values.append(line)

    # A compact box filter removes object-sized depth spikes but keeps the
    # separate mountain, valley, lake, and foreground distance bands.
    radius = 2
    smoothed = [[0.0] * GRID_X for _ in range(GRID_Y)]
    for row in range(GRID_Y):
        for column in range(GRID_X):
            total = 0.0
            count = 0
            for sy in range(max(0, row - radius), min(GRID_Y, row + radius + 1)):
                for sx in range(max(0, column - radius), min(GRID_X, column + radius + 1)):
                    total += values[sy][sx]
                    count += 1
            smoothed[row][column] = total / count
    return smoothed


def plate_material():
    material = bpy.data.materials.new("Clean landscape projection")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    coordinates = nodes.new("ShaderNodeTexCoord")
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = bpy.data.images.load(PLATE_PATH, check_existing=True)
    texture.interpolation = "Linear"
    links.new(coordinates.outputs["UV"], texture.inputs["Vector"])
    links.new(texture.outputs["Color"], bsdf.inputs["Base Color"])
    emission = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
    if emission:
        links.new(texture.outputs["Color"], emission)
    strength = bsdf.inputs.get("Emission Strength")
    if strength:
        strength.default_value = 0.72
    bsdf.inputs["Roughness"].default_value = 0.98
    return material


def build_relief(depth):
    vertices = []
    faces = []
    uvs = []
    for row in range(GRID_Y):
        v = row / (GRID_Y - 1)
        z = (v - 0.5) * RELIEF_HEIGHT
        for column in range(GRID_X):
            u = column / (GRID_X - 1)
            x = (u - 0.5) * RELIEF_WIDTH
            # The camera sits on negative Y, so white/near pixels move toward
            # it and black/far pixels recede into the card.
            y = (0.5 - depth[row][column]) * RELIEF_DEPTH
            vertices.append((x, y, z))
            uvs.append((u, v))
    for row in range(GRID_Y - 1):
        for column in range(GRID_X - 1):
            a = row * GRID_X + column
            b = a + 1
            d = (row + 1) * GRID_X + column
            c = d + 1
            faces.append((a, b, c, d))

    mesh = bpy.data.meshes.new("Landscape_depth_relief_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    uv_layer = mesh.uv_layers.new(name="Landscape projection UV")
    for polygon in mesh.polygons:
        for loop_index in polygon.loop_indices:
            vertex_index = mesh.loops[loop_index].vertex_index
            uv_layer.data[loop_index].uv = uvs[vertex_index]
        polygon.use_smooth = True
    relief = bpy.data.objects.new("CLEAN_HIMALAYAN_LANDSCAPE_RELIEF", mesh)
    bpy.context.collection.objects.link(relief)
    relief.data.materials.append(plate_material())
    return relief


def point_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def configure_render():
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except Exception:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1536
    scene.render.resolution_y = 1024
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.world = scene.world or bpy.data.worlds.new("Landscape relief world")
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.06, 0.56, 0.62, 1)
    background.inputs["Strength"].default_value = 0.72
    try:
        scene.view_settings.view_transform = "Standard"
        scene.view_settings.look = "Medium High Contrast"
    except Exception:
        pass


def build():
    clear_scene()
    relief = build_relief(sample_depth())
    configure_render()

    bpy.ops.object.light_add(type="AREA", location=(0, -120, 45))
    light = bpy.context.object
    light.name = "Relief_softbox"
    light.data.energy = 550
    light.data.shape = "RECTANGLE"
    light.data.size = 150
    light.data.size_y = 95
    point_at(light, (0, 0, 0))

    bpy.ops.object.camera_add(location=(0, -190, 0))
    camera = bpy.context.object
    camera.name = "EXACT_LANDSCAPE_PLATE_CAMERA"
    camera.data.type = "ORTHO"
    # Blender's orthographic scale is the view width; 180 / 1.5 = 120 high,
    # exactly matching the relief and the 1536x1024 source plate.
    camera.data.ortho_scale = 180.0
    camera.data.clip_start = 0.1
    camera.data.clip_end = 450.0
    # Looking exactly along +Y with world +Z as screen-up. A generic look-at
    # has an up-axis singularity for this front-on relief camera.
    camera.rotation_euler = (math.pi / 2, 0, 0)
    bpy.context.scene.camera = camera
    bpy.context.scene.render.filepath = FRONT_RENDER_PATH
    bpy.ops.render.render(write_still=True)

    camera.location = (34, -190, 12)
    camera.data.ortho_scale = 190.0
    point_at(camera, (0, 0, 0))
    bpy.context.scene.render.filepath = PARALLAX_RENDER_PATH
    bpy.ops.render.render(write_still=True)

    bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=GLB_PATH,
        export_format="GLB",
        use_selection=True,
        export_cameras=False,
        export_lights=False,
        export_apply=True,
    )
    print("NIMBU LANDSCAPE RELIEF COMPLETE", BLEND_PATH, GLB_PATH, len(relief.data.vertices))


build()
