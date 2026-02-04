const recipes = {
    "lc_wuling_battery": {
        "name": "LC Wuling Battery",
        "outputCount": 1,
        "time": 10,
        "machine": "Forge of the Sky",
        "inputs": [
            { "item": "xiranite", "count": 5 },
            { "item": "dense_originium_powder", "count": 15 }
        ]
    },
    "xiranite": {
        "name": "Xiranite",
        "outputCount": 1,
        "time": 2,
        "machine": "Forge of the Sky",
        "inputs": [
            { "item": "stabilized_carbon", "count": 2 },
            { "item": "clean_water", "count": 1 }
        ]
    },
    "stabilized_carbon": {
        "name": "Stabilized Carbon",
        "outputCount": 1,
        "time": 2,
        "machine": "Refining Unit",
        "inputs": [
            { "item": "dense_carbon_powder", "count": 1 }
        ]
    },
    "carbon": {
        "name": "Carbon",
        "outputCount": 1,
        "time": 2,
        "machine": "Refining Unit",
        "inputs": [
            { "item": "buckflower", "count": 1 }
        ]
    },
    "carbon_powder": {
        "name": "Carbon Powder",
        "outputCount": 2,
        "time": 2,
        "machine": "Shredding Unit",
        "inputs": [
            { "item": "carbon", "count": 1 }
        ]
    },
    "dense_carbon_powder": {
        "name": "Dense Carbon Powder",
        "outputCount": 1,
        "time": 2,
        "machine": "Grinding Unit",
        "inputs": [
            { "item": "carbon_powder", "count": 2 },
            { "item": "sandleaf_powder", "count": 1 }
        ]
    },
    "sandleaf_powder": {
        "name": "Sandleaf Powder",
        "outputCount": 1,
        "time": 2,
        "machine": "Shredding Unit",
        "inputs": [
            { "item": "sandleaf", "count": 1 }
        ]
    },
    "dense_originium_powder": {
        "name": "Dense Originium Powder",
        "outputCount": 1,
        "time": 2,
        "machine": "Grinding Unit",
        "inputs": [
            { "item": "originium_powder", "count": 2 },
            { "item": "sandleaf_powder", "count": 1 }
        ]
    },
    "originium_powder": {
        "name": "Originium Powder",
        "outputCount": 1,
        "time": 2,
        "machine": "Grinding Unit",
        "inputs": [
            { "item": "originium_ore", "count": 1 }
        ]
    },
    // Raw Materials (Optional entries to give them nice names)
    "amethyst": { "name": "Amethyst", "inputs": [] },
    "originium_ore": { "name": "Originium Ore", "inputs": [] },
    "ferrium": { "name": "Ferrium", "inputs": [] },
    "sandleaf": { "name": "Sandleaf", "inputs": [] },
    "buckflower": { "name": "Buckflower", "inputs": [] },
    "clean_water": { "name": "Clean Water", "inputs": [] }
};
