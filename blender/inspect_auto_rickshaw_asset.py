import bpy
import math
from mathutils import Vector


SOURCE = "/Users/rehaanr/Documents/openai/blender/source_assets/indian_auto_rickshaw.glb"
OUTPUT = "/tmp/nimbu-auto-rickshaw-source.png"

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SOURCE)

meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
points = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
minimum = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
maximum = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
center = (minimum + maximum) * 0.5

bpy.ops.mesh.primitive_plane_add(size=30, location=(center.x, center.y, minimum.z - 0.03))
ground = bpy.context.object
material = bpy.data.materials.new("preview ground")
material.diffuse_color = (0.18, 0.22, 0.19, 1)
ground.data.materials.append(material)

bpy.ops.object.light_add(type="AREA", location=(center.x - 4, center.y - 6, maximum.z + 7))
bpy.context.object.data.energy = 1100
bpy.context.object.data.shape = "DISK"
bpy.context.object.data.size = 7
bpy.ops.object.light_add(type="SUN", location=(0, 0, 8))
bpy.context.object.rotation_euler = (math.radians(28), math.radians(-18), math.radians(-35))
bpy.context.object.data.energy = 2.2

bpy.ops.object.camera_add(location=(center.x + 8.5, center.y - 10.5, maximum.z + 5.0))
camera = bpy.context.object
direction = center - camera.location
camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
camera.data.lens = 54
bpy.context.scene.camera = camera

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1000
scene.render.resolution_y = 760
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = OUTPUT
scene.world = bpy.data.worlds.new("preview world")
scene.world.color = (0.07, 0.09, 0.10)
scene.view_settings.look = "AgX - Medium High Contrast"
bpy.ops.render.render(write_still=True)
print("AUTO_SOURCE_PREVIEW", OUTPUT, "bounds", tuple(minimum), tuple(maximum))
