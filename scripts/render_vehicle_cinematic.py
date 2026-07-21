"""Render a short moving-vehicle clip from an existing Speakworld Blender scene.

Usage (after --): output.mp4 VEHICLE_ROOT ROUTE_PREFIX [start_index] [route_count]
"""
import bpy
import math
import os
import sys
from mathutils import Vector


def args_after_dash():
    return sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


args = args_after_dash()
if len(args) < 3:
    raise SystemExit("output.mp4 VEHICLE_ROOT ROUTE_PREFIX [start_index] [route_count]")

output, vehicle_name, route_prefix = args[:3]
start_index = int(args[3]) if len(args) > 3 else 0
route_count = int(args[4]) if len(args) > 4 else 6

scene = bpy.context.scene
vehicle = bpy.data.objects.get(vehicle_name)
if vehicle is None:
    raise RuntimeError(f"Missing vehicle root: {vehicle_name}")

markers = sorted(
    [o for o in bpy.data.objects if o.name.startswith(route_prefix) and o.name[len(route_prefix):].isdigit()],
    key=lambda o: int(o.name[len(route_prefix):]),
)
if not markers:
    raise RuntimeError(f"No route markers for {route_prefix}")

selected = [markers[(start_index + i) % len(markers)] for i in range(min(route_count, len(markers)))]
points = [m.matrix_world.translation.copy() for m in selected]
if len(points) < 2:
    raise RuntimeError("Need at least two route points")

# Animate the original authored vehicle root in world space.
world_matrix = vehicle.matrix_world.copy()
vehicle.parent = None
vehicle.matrix_world = world_matrix
vehicle.animation_data_clear()

scene.frame_start = 1
scene.frame_end = 75
scene.render.fps = 30
scene.render.resolution_x = 960
scene.render.resolution_y = 540
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
frames_dir = output + "_frames"
os.makedirs(frames_dir, exist_ok=True)
scene.render.filepath = os.path.join(frames_dir, "frame_")
scene.render.film_transparent = False
try:
    scene.render.engine = "BLENDER_EEVEE_NEXT"
except Exception:
    pass

camera_data = bpy.data.cameras.new("SPEAKWORLD_CINEMATIC_CAMERA")
camera = bpy.data.objects.new("SPEAKWORLD_CINEMATIC_CAMERA", camera_data)
bpy.context.collection.objects.link(camera)
camera_data.lens = 48
camera_data.sensor_width = 36
scene.camera = camera

# Add a soft sun if the authored scene has no useful lighting.
if not any(o.type == "LIGHT" for o in bpy.data.objects):
    sun_data = bpy.data.lights.new("SPEAKWORLD_SUN", "SUN")
    sun_data.energy = 2.0
    sun = bpy.data.objects.new("SPEAKWORLD_SUN", sun_data)
    bpy.context.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(35), 0, math.radians(28))

key_count = len(points)
for i, point in enumerate(points):
    frame = round(1 + i * (scene.frame_end - 1) / (key_count - 1))
    nxt = points[min(i + 1, key_count - 1)]
    prev = points[max(0, i - 1)]
    travel = nxt - prev
    if travel.length < 0.01:
        travel = Vector((1, 0, 0))
    travel.normalize()

    vehicle.location = point
    vehicle.rotation_euler[2] = math.atan2(travel.y, travel.x)
    vehicle.keyframe_insert("location", frame=frame)
    vehicle.keyframe_insert("rotation_euler", frame=frame)

    side = Vector((-travel.y, travel.x, 0))
    camera.location = point - travel * 12 + side * 4 + Vector((0, 0, 6.5))
    look_at(camera, point + travel * 5 + Vector((0, 0, 1.5)))
    camera.keyframe_insert("location", frame=frame)
    camera.keyframe_insert("rotation_euler", frame=frame)

bpy.ops.render.render(animation=True)
