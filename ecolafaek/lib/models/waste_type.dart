class WasteType {
  final int id;
  final String name;
  final String? description;
  final String hazardLevel;
  final bool recyclable;
  final String? iconUrl;

  WasteType({
    required this.id,
    required this.name,
    this.description,
    required this.hazardLevel,
    required this.recyclable,
    this.iconUrl,
  });

  // Create from JSON (from API)
  factory WasteType.fromJson(Map<String, dynamic> json) {
    return WasteType(
      id: json['waste_type_id'],
      name: json['name'],
      description: json['description'],
      hazardLevel: json['hazard_level'] ?? 'low',
      recyclable: json['recyclable'] == true,
      iconUrl: json['icon_url'],
    );
  }

  // Convert to JSON for API
  Map<String, dynamic> toJson() {
    return {
      'waste_type_id': id,
      'name': name,
      if (description != null) 'description': description,
      'hazard_level': hazardLevel,
      'recyclable': recyclable,
      if (iconUrl != null) 'icon_url': iconUrl,
    };
  }

  // Get icon color based on hazard level
  int getHazardColor() {
    switch (hazardLevel.toLowerCase()) {
      case 'high':
        return 0xFFF44336; // Red
      case 'medium':
        return 0xFFFF9800; // Orange
      case 'low':
      default:
        return 0xFF4CAF50; // Green
    }
  }
}

// Predefined common waste types
class WasteTypes {
  static const int PLASTIC = 1;
  static const int PAPER = 2;
  static const int GLASS = 3;
  static const int METAL = 4;
  static const int ORGANIC = 5;
  static const int ELECTRONIC = 6;
  static const int HAZARDOUS = 7;
  static const int CONSTRUCTION = 8;
  static const int MIXED = 9;

  // Get a list of common waste types
  static List<WasteType> getCommonWasteTypes() {
    return [
      WasteType(
        id: PLASTIC,
        name: 'Plastic',
        description: 'Plastic bottles, bags, packaging',
        hazardLevel: 'medium',
        recyclable: true,
        iconUrl: 'assets/icons/plastic.png',
      ),
      WasteType(
        id: PAPER,
        name: 'Paper',
        description: 'Cardboard, newspapers, magazines',
        hazardLevel: 'low',
        recyclable: true,
        iconUrl: 'assets/icons/paper.png',
      ),
      WasteType(
        id: GLASS,
        name: 'Glass',
        description: 'Bottles, jars, broken glass',
        hazardLevel: 'medium',
        recyclable: true,
        iconUrl: 'assets/icons/glass.png',
      ),
      WasteType(
        id: METAL,
        name: 'Metal',
        description: 'Cans, scrap metal, aluminum',
        hazardLevel: 'low',
        recyclable: true,
        iconUrl: 'assets/icons/metal.png',
      ),
      WasteType(
        id: ORGANIC,
        name: 'Organic',
        description: 'Food waste, garden waste, biodegradable materials',
        hazardLevel: 'low',
        recyclable: true,
        iconUrl: 'assets/icons/organic.png',
      ),
      WasteType(
        id: ELECTRONIC,
        name: 'Electronic',
        description: 'E-waste, batteries, electronics',
        hazardLevel: 'high',
        recyclable: true,
        iconUrl: 'assets/icons/electronic.png',
      ),
      WasteType(
        id: HAZARDOUS,
        name: 'Hazardous',
        description: 'Chemicals, medical waste, toxic materials',
        hazardLevel: 'high',
        recyclable: false,
        iconUrl: 'assets/icons/hazardous.png',
      ),
      WasteType(
        id: CONSTRUCTION,
        name: 'Construction',
        description: 'Building materials, rubble, debris',
        hazardLevel: 'medium',
        recyclable: false,
        iconUrl: 'assets/icons/construction.png',
      ),
      WasteType(
        id: MIXED,
        name: 'Mixed',
        description: 'Various types of waste mixed together',
        hazardLevel: 'medium',
        recyclable: false,
        iconUrl: 'assets/icons/mixed.png',
      ),
    ];
  }

  // Find waste type by ID
  static WasteType? findById(int id) {
    try {
      return getCommonWasteTypes().firstWhere((type) => type.id == id);
    } catch (e) {
      return null;
    }
  }

  // Find waste type by name
  static WasteType? findByName(String name) {
    try {
      return getCommonWasteTypes().firstWhere(
        (type) => type.name.toLowerCase() == name.toLowerCase(),
      );
    } catch (e) {
      return null;
    }
  }
}