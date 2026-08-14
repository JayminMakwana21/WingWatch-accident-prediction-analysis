from typing import Dict, Any


def _clamp(value: float, min_v: float, max_v: float) -> float:
    return max(min_v, min(max_v, value))


def calculate_physics_risk(payload: Dict[str, Any]) -> Dict[str, Any]:
    speed_kmph = float(payload.get("speed_kmph", 40) or 40)
    speed_mps = speed_kmph / 3.6

    vehicle_type = str(payload.get("vehicle_type", "car")).lower()
    weather = str(payload.get("weather_condition", "clear")).lower()
    road_condition = str(payload.get("road_condition", "dry")).lower()
    time_of_day = str(payload.get("time_of_day", "day")).lower()

    helmet_used = str(payload.get("helmet_used", "yes")).lower() in ["yes", "true", "1"]
    seatbelt_used = str(payload.get("seatbelt_used", "yes")).lower() in ["yes", "true", "1"]
    alcohol_involved = str(payload.get("alcohol_involved", "no")).lower() in ["yes", "true", "1"]
    mobile_usage = str(payload.get("mobile_usage", "no")).lower() in ["yes", "true", "1"]
    driver_license = str(payload.get("driver_license", "yes")).lower() in ["yes", "true", "1"]

    vehicle_mass = {
        "motorcycle": 220,
        "bicycle": 90,
        "car": 1400,
        "suv": 1900,
        "truck": 6000,
        "bus": 9000,
    }.get(vehicle_type, 1400)

    vulnerability = {
        "bicycle": 1.0,
        "motorcycle": 0.95,
        "car": 0.55,
        "suv": 0.5,
        "truck": 0.45,
        "bus": 0.4,
    }.get(vehicle_type, 0.55)

    friction_factor = {
        "dry": 0.85,
        "good": 0.82,
        "wet": 0.55,
        "rainy": 0.5,
        "poor": 0.45,
        "icy": 0.25,
    }.get(road_condition, 0.65)

    weather_visibility = {
        "clear": 1.0,
        "cloudy": 0.9,
        "rain": 0.75,
        "rainy": 0.72,
        "fog": 0.55,
        "foggy": 0.5,
        "storm": 0.45,
        "snow": 0.5,
    }.get(weather, 0.85)

    time_visibility = {
        "day": 1.0,
        "morning": 0.95,
        "afternoon": 0.95,
        "evening": 0.75,
        "night": 0.55,
    }.get(time_of_day, 0.85)

    visibility = weather_visibility * time_visibility
    reaction_time = 1.5
    if alcohol_involved:
        reaction_time += 0.8
    if mobile_usage:
        reaction_time += 0.6
    if not driver_license:
        reaction_time += 0.4

    braking_distance = (speed_mps ** 2) / (2 * 9.81 * max(friction_factor, 0.1))
    reaction_distance = speed_mps * reaction_time
    stopping_distance = braking_distance + reaction_distance

    kinetic_energy = 0.5 * vehicle_mass * (speed_mps ** 2)
    crash_force_factor = _clamp((kinetic_energy / 350000.0), 0.0, 2.0)

    protection = 0.0
    protection += 0.2 if helmet_used else 0.0
    protection += 0.25 if seatbelt_used else 0.0

    risk_raw = (
        0.25 * _clamp(speed_kmph / 120.0, 0.0, 1.5)
        + 0.2 * _clamp(crash_force_factor, 0.0, 1.5)
        + 0.15 * (1 - friction_factor)
        + 0.15 * (1 - visibility)
        + 0.1 * vulnerability
        + 0.1 * _clamp(stopping_distance / 120.0, 0.0, 1.5)
        + 0.05 * (1 if alcohol_involved else 0)
        + 0.05 * (1 if mobile_usage else 0)
    )

    risk_after_safety = _clamp(risk_raw - protection, 0.0, 1.0)
    risk_percentage = round(risk_after_safety * 100, 2)

    if risk_percentage <= 25:
        level = "LOW"
    elif risk_percentage <= 50:
        level = "MODERATE"
    elif risk_percentage <= 75:
        level = "HIGH"
    else:
        level = "CRITICAL"

    return {
        "risk_percentage": risk_percentage,
        "risk_level": level,
        "physics": {
            "kinetic_energy_j": round(kinetic_energy, 2),
            "reaction_time_s": round(reaction_time, 2),
            "friction_factor": round(friction_factor, 2),
            "visibility_factor": round(visibility, 2),
            "stopping_distance_m": round(stopping_distance, 2),
            "crash_force_factor": round(crash_force_factor, 2),
            "safety_protection_factor": round(protection, 2),
        },
    }


def generate_safety_recommendations(payload: Dict[str, Any], risk_level: str):
    recommendations = []

    if float(payload.get("speed_kmph", 0) or 0) > 70:
        recommendations.append("Reduce speed, especially near intersections and pedestrian zones.")
    if str(payload.get("mobile_usage", "no")).lower() in ["yes", "true", "1"]:
        recommendations.append("Avoid mobile phone usage while driving to improve reaction time.")
    if str(payload.get("helmet_used", "yes")).lower() not in ["yes", "true", "1"]:
        recommendations.append("Wear a helmet consistently to reduce severe head injuries.")
    if str(payload.get("seatbelt_used", "yes")).lower() not in ["yes", "true", "1"]:
        recommendations.append("Always fasten the seatbelt before the trip starts.")

    weather = str(payload.get("weather_condition", "clear")).lower()
    if weather in ["rain", "rainy", "fog", "foggy", "storm", "snow"]:
        recommendations.append("Increase following distance and drive cautiously in poor weather.")

    if risk_level in ["HIGH", "CRITICAL"]:
        recommendations.append("Plan routes with lower traffic and avoid aggressive overtaking.")

    if not recommendations:
        recommendations.append("Maintain current safety habits and stay alert to road conditions.")

    return recommendations[:6]
