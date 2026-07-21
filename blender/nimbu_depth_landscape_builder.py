import bpy
import math
import os
from mathutils import Vector


ROOT = "/Users/rehaanr/Documents/openai"
DEPTH_PATH = "/Users/rehaanr/Downloads/tmpnh02xaqy.png"
REFERENCE_PATH = "/Users/rehaanr/Downloads/User attachment.png"
BLEND_PATH = os.path.join(ROOT, "blender", "nimbu_depth_landscape_master.blend")
GLB_PATH = os.path.join(ROOT, "public", "assets", "nimbu_depth_landscape.glb")
RENDER_PATH = os.path.join(ROOT, "blender", "output", "nimbu_depth_landscape.png")
PARALLAX_PATH = os.path.join(ROOT, "blender", "output", "nimbu_depth_landscape_parallax.png")

GRID_X = 192
GRID_Y = 128
WORLD_WIDTH = 156.0
WORLD_DEPTH = 220.0
WORLD_BOTTOM = -31.0
DEPTH_BLUR_RADIUS = 3
COLOR_BLUR_RADIUS = 5


ISLAND_POLYGON = (
    (0.49, 0.985), (0.61, 0.970), (0.76, 0.900), (0.87, 0.805),
    (0.94, 0.660), (0.974, 0.470), (0.955, 0.285), (0.895, 0.145),
    (0.775, 0.055), (0.600, 0.015), (0.430, 0.018), (0.255, 0.060),
    (0.120, 0.145), (0.045, 0.315), (0.030, 0.505), (0.075, 0.675),
    (0.160, 0.825), (0.300, 0.935),
)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for blocks in (bpy.data.meshes, bpy.data.materials, bpy.data.curves, bpy.data.cameras, bpy.data.lights):
        for block in list(blocks):
            if block.users == 0:
                blocks.remove(block)


def material(name, color, roughness=0.92):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


def vertex_color_material():
    mat = bpy.data.materials.new("Depth guided landscape colour")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    vertex = nodes.new("ShaderNodeVertexColor")
    vertex.layer_name = "landscape_color"
    links.new(vertex.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.96
    return mat


def image_grid(path, channels):
    image = bpy.data.images.load(path, check_existing=True)
    width, height = image.size
    pixels = image.pixels
    result = []
    for row in range(GRID_Y):
        py = round(row / (GRID_Y - 1) * (height - 1))
        values = []
        for column in range(GRID_X):
            px = round(column / (GRID_X - 1) * (width - 1))
            offset = (py * width + px) * 4
            if channels == 1:
                values.append(float(pixels[offset]))
            else:
                values.append((float(pixels[offset]), float(pixels[offset + 1]), float(pixels[offset + 2])))
        result.append(values)
    return result


def blur_scalar(grid, radius):
    height = len(grid)
    width = len(grid[0])
    integral = [[0.0] * (width + 1) for _ in range(height + 1)]
    for y in range(height):
        running = 0.0
        for x in range(width):
            running += grid[y][x]
            integral[y + 1][x + 1] = integral[y][x + 1] + running
    output = [[0.0] * width for _ in range(height)]
    for y in range(height):
        y0, y1 = max(0, y - radius), min(height - 1, y + radius)
        for x in range(width):
            x0, x1 = max(0, x - radius), min(width - 1, x + radius)
            total = integral[y1 + 1][x1 + 1] - integral[y0][x1 + 1] - integral[y1 + 1][x0] + integral[y0][x0]
            output[y][x] = total / ((x1 - x0 + 1) * (y1 - y0 + 1))
    return output


def blur_rgb(grid, radius):
    channels = []
    for channel in range(3):
        channels.append(blur_scalar([[pixel[channel] for pixel in row] for row in grid], radius))
    return [[tuple(channels[channel][y][x] for channel in range(3)) for x in range(GRID_X)] for y in range(GRID_Y)]


def point_in_polygon(x, y, polygon=ISLAND_POLYGON):
    inside = False
    previous = polygon[-1]
    for current in polygon:
        x1, y1 = previous
        x2, y2 = current
        if (y1 > y) != (y2 > y):
            crossing = (x2 - x1) * (y - y1) / (y2 - y1) + x1
            if x < crossing:
                inside = not inside
        previous = current
    return inside


def elevation(depth, u, v):
    # Depth Anything is white nearby and dark far away. Inverting it turns the
    # dark northern mountain layers into height while keeping the lower bazaar
    # shelf broad and low. A gentle northward rise restores the island's macro
    # slope after removing object-scale depth noise.
    distance_height = max(0.0, min(1.0, 1.0 - depth)) ** 1.38 * 25.5
    north_rise = max(0.0, (v - 0.30) / 0.70) ** 1.55 * 7.5
    x = (u - 0.5) * WORLD_WIDTH
    y = WORLD_BOTTOM + v * WORLD_DEPTH
    # Explicitly preserve the large central lake basin and its outflow gorge;
    # the depth map alone confuses reflective water with foreground geometry.
    lake = math.exp(-(((x + 4.0) / 25.0) ** 2 + ((y - 77.0) / 20.0) ** 2) * 2.0)
    river = math.exp(-(((x - 18.0) / 9.0) ** 2 + ((y - 35.0) / 43.0) ** 2) * 2.0)
    return max(-1.4, distance_height + north_rise - lake * 7.8 - river * 2.2)


def landscape_color(rgb, height, u, v):
    # Keep the reference's placement of warm fields, forest, stone, and snow,
    # but deliberately blur away roads/buildings from the source image.
    r, g, b = rgb
    luma = r * 0.24 + g * 0.60 + b * 0.16
    green_bias = max(0.0, g - max(r, b) * 0.72)
    if green_bias > 0.05 or g > r * 1.04:
        base = (0.13 + luma * 0.16, 0.38 + luma * 0.30, 0.16 + luma * 0.12)
    else:
        base = (0.34 + luma * 0.25, 0.31 + luma * 0.22, 0.24 + luma * 0.18)
    return (*tuple(max(0.02, min(0.92, value)) for value in base), 1.0)


def build_terrain(depth, colors, terrain_mat, cliff_mat):
    vertices = []
    vertex_lookup = {}
    vertex_colors = []
    for row in range(GRID_Y):
        v = row / (GRID_Y - 1)
        y = WORLD_BOTTOM + v * WORLD_DEPTH
        for column in range(GRID_X):
            u = column / (GRID_X - 1)
            if not point_in_polygon(u, v):
                continue
            x = (u - 0.5) * WORLD_WIDTH
            z = elevation(depth[row][column], u, v)
            vertex_lookup[(row, column)] = len(vertices)
            vertices.append((x, y, z))
            vertex_colors.append(landscape_color(colors[row][column], z, u, v))

    faces = []
    for row in range(GRID_Y - 1):
        for column in range(GRID_X - 1):
            corners = (
                vertex_lookup.get((row, column)), vertex_lookup.get((row, column + 1)),
                vertex_lookup.get((row + 1, column + 1)), vertex_lookup.get((row + 1, column)),
            )
            if all(index is not None for index in corners):
                a, b, c, d = corners
                faces.extend(((a, b, c), (a, c, d)))

    mesh = bpy.data.meshes.new("Depth_landscape_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    color_layer = mesh.color_attributes.new(name="landscape_color", type="FLOAT_COLOR", domain="POINT")
    for index, color in enumerate(vertex_colors):
        color_layer.data[index].color = color
    terrain = bpy.data.objects.new("DEPTH_GUIDED_HIMALAYAN_TERRAIN", mesh)
    bpy.context.collection.objects.link(terrain)
    terrain.data.materials.append(terrain_mat)
    for polygon in mesh.polygons:
        polygon.use_smooth = True

    # A hand-traced skirt follows the source island silhouette. It is separate
    # from the heightfield so later gameplay collision can use a cleaner mesh.
    top = []
    bottom = []
    for u, v in ISLAND_POLYGON:
        column = min(GRID_X - 1, max(0, round(u * (GRID_X - 1))))
        row = min(GRID_Y - 1, max(0, round(v * (GRID_Y - 1))))
        x = (u - 0.5) * WORLD_WIDTH
        y = WORLD_BOTTOM + v * WORLD_DEPTH
        z = elevation(depth[row][column], u, v)
        top.append((x, y, z))
        bottom.append((x, y, -15.0))
    skirt_vertices = top + bottom
    skirt_faces = []
    count = len(top)
    for index in range(count):
        following = (index + 1) % count
        skirt_faces.append((index, following, count + following, count + index))
    skirt_mesh = bpy.data.meshes.new("Island_cliff_skirt_mesh")
    skirt_mesh.from_pydata(skirt_vertices, [], skirt_faces)
    skirt_mesh.update()
    skirt = bpy.data.objects.new("DEPTH_GUIDED_ISLAND_CLIFFS", skirt_mesh)
    bpy.context.collection.objects.link(skirt)
    skirt.data.materials.append(cliff_mat)
    return terrain, skirt


def create_background_mountains(stone, snow):
    parent = bpy.data.objects.new("DISTANT_HIMALAYAN_RANGE", None)
    bpy.context.collection.objects.link(parent)
    peaks = (
        (-73, 200, 3, 34, 42), (-43, 206, 4, 30, 52), (-12, 211, 5, 39, 57),
        (24, 210, 4, 36, 60), (57, 205, 3, 33, 49), (80, 198, 2, 27, 40),
    )
    for index, (x, y, base_z, width, height) in enumerate(peaks):
        vertices = (
            (x - width * 0.60, y, base_z), (x - width * 0.25, y, base_z + height * 0.45),
            (x, y, base_z + height), (x + width * 0.27, y, base_z + height * 0.50),
            (x + width * 0.62, y, base_z),
        )
        mesh = bpy.data.meshes.new(f"Mountain_peak_{index}_mesh")
        mesh.from_pydata(vertices, [], ((0, 1, 4), (1, 3, 4), (1, 2, 3)))
        mountain = bpy.data.objects.new(f"Mountain_peak_{index}", mesh)
        bpy.context.collection.objects.link(mountain)
        mountain.parent = parent
        mountain.data.materials.append(stone)
        snow_vertices = (
            vertices[2],
            (x - width * 0.13, y - 0.03, base_z + height * 0.67),
            (x + width * 0.16, y - 0.03, base_z + height * 0.63),
        )
        snow_mesh = bpy.data.meshes.new(f"Snow_cap_{index}_mesh")
        snow_mesh.from_pydata(snow_vertices, [], ((0, 1, 2),))
        cap = bpy.data.objects.new(f"Snow_cap_{index}", snow_mesh)
        bpy.context.collection.objects.link(cap)
        cap.parent = parent
        cap.data.materials.append(snow)
    return parent


def create_water(water_mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=16, location=(-4.0, 77.0, -0.65), scale=(25.0, 18.0, 0.34))
    lake = bpy.context.object
    lake.name = "CENTRAL_LAKE_PLACEHOLDER"
    lake.data.materials.append(water_mat)
    bpy.ops.mesh.primitive_plane_add(size=2, location=(0, 78, -15.3), scale=(210, 210, 1))
    mist = bpy.context.object
    mist.name = "TURQUOISE_MIST_GROUND"
    mist.data.materials.append(water_mat)
    return lake, mist


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
    scene.world = scene.world or bpy.data.worlds.new("Depth landscape world")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.10, 0.55, 0.61, 1)
    scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.75
    try:
        scene.view_settings.view_transform = "Standard"
        scene.view_settings.look = "Medium High Contrast"
    except Exception:
        pass


def build():
    clear_scene()
    depth = blur_scalar(image_grid(DEPTH_PATH, 1), DEPTH_BLUR_RADIUS)
    colors = blur_rgb(image_grid(REFERENCE_PATH, 3), COLOR_BLUR_RADIUS)

    terrain_mat = vertex_color_material()
    cliff_mat = material("Warm faceted cliffs", (0.31, 0.29, 0.23, 1))
    mountain_mat = material("Distant blue stone", (0.34, 0.52, 0.55, 1))
    snow_mat = material("Himalayan snow", (0.83, 0.89, 0.85, 1))
    water_mat = material("Turquoise basin", (0.03, 0.56, 0.63, 1), 0.72)
    build_terrain(depth, colors, terrain_mat, cliff_mat)
    create_background_mountains(mountain_mat, snow_mat)
    create_water(water_mat)

    bpy.ops.object.light_add(type="SUN", location=(-30, -40, 80))
    sun = bpy.context.object
    sun.name = "Landscape_sun"
    sun.data.energy = 2.4
    sun.data.color = (1.0, 0.80, 0.56)
    sun.data.angle = math.radians(9)
    sun.rotation_euler = (math.radians(28), math.radians(-22), math.radians(-32))
    bpy.ops.object.light_add(type="AREA", location=(0, -50, 95))
    fill = bpy.context.object
    fill.name = "Landscape_fill"
    fill.data.energy = 850
    fill.data.shape = "DISK"
    fill.data.size = 80
    point_at(fill, (0, 82, 6))

    configure_render()
    bpy.ops.object.camera_add(location=(150.0, -188.0, 151.0))
    camera = bpy.context.object
    camera.name = "DEPTH_LANDSCAPE_MAP_CAMERA"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 228.0
    camera.data.clip_end = 500
    point_at(camera, (0, 78, 4))
    bpy.context.scene.camera = camera
    bpy.context.scene.render.filepath = RENDER_PATH
    bpy.ops.render.render(write_still=True)

    camera.location = (128.0, -148.0, 112.0)
    camera.data.ortho_scale = 205.0
    point_at(camera, (0, 84, 5))
    bpy.context.scene.render.filepath = PARALLAX_PATH
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
    print("NIMBU DEPTH LANDSCAPE COMPLETE", BLEND_PATH, GLB_PATH)


build()
