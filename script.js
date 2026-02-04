document.addEventListener('DOMContentLoaded', () => {
    const itemSelect = document.getElementById('item-select');
    // goalValueInput removed from HTML, so we don't need it here.
    const treeContainer = document.getElementById('tree-container');
    const resourceSummary = document.getElementById('resource-summary');
    const resourceList = document.getElementById('resource-list');

    if (typeof recipes === 'undefined') {
        treeContainer.innerHTML = `<div class="empty-state" style="color: #ef4444;">Error: recipes.js not loaded.</div>`;
        return;
    }

    populateDropdown();

    function populateDropdown() {
        const sortedKeys = Object.keys(recipes).sort((a, b) => {
            const nameA = recipes[a].name || a;
            const nameB = recipes[b].name || b;
            return nameA.localeCompare(nameB);
        });

        sortedKeys.forEach(key => {
            if (recipes[key].inputs && recipes[key].inputs.length > 0) {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = recipes[key].name || key;
                itemSelect.appendChild(option);
            }
        });

        itemSelect.addEventListener('change', (e) => {
            const selectedItemKey = e.target.value;
            if (selectedItemKey) {
                renderTree(selectedItemKey);
            }
        });
    }

    /* 
     * NEW LOGIC: Calculate based on Target Rate (Items / Minute) 
     */
    function buildTreeData(itemKey, targetRatePerMin, accumulatedResources = {}) {
        const recipe = recipes[itemKey];
        const isRaw = !recipe || !recipe.inputs || recipe.inputs.length === 0;

        // Base case: No recipe or Raw Resource (empty inputs)
        if (isRaw) {
            const displayName = (recipe && recipe.name) ? recipe.name : itemKey.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

            // Accumulate raw resources
            if (!accumulatedResources[displayName]) {
                accumulatedResources[displayName] = 0;
            }
            accumulatedResources[displayName] += targetRatePerMin;

            // If it's a raw resource defined in recipes, it might represent a Mining operation
            // But if it has no time/machine info, we treat it purely as a resource node.
            // If the user adds mining recipes later (with time/inputs), this logic will adapt.
            // For now, entries like "originium_ore": { inputs: [] } are treated as raw sources.

            return {
                name: displayName,
                rate: targetRatePerMin,
                machines: 0,
                children: null
            };
        }

        const displayName = recipe.name || itemKey;
        const outputCount = recipe.outputCount || 1;
        const timeSeconds = recipe.time || 1;

        // Rate per machine (Items / Minute)
        // (60s / time) * outputCount
        const machineRatePerMin = (60 / timeSeconds) * outputCount;

        // Machines needed to meet demand
        const machinesNeededDecimal = targetRatePerMin / machineRatePerMin;
        const machinesNeededCeil = Math.ceil(machinesNeededDecimal - 0.001); // Tolerance

        const children = recipe.inputs ? recipe.inputs.map(ing => {
            // How many items do we need?
            // neededInputRate = (targetRate / outputCount) * inputCount
            const neededInputRate = (targetRatePerMin / outputCount) * ing.count;

            const childNode = buildTreeData(ing.item, neededInputRate, accumulatedResources);

            childNode.edgeMeta = {
                rate: neededInputRate
            };

            return childNode;
        }) : [];

        // If this item is also used as a raw ingredient elsewhere (unlikely in this tree structure but possible),
        // we might want to track intermediate products too. But usually "Miners" implies raw resources.
        // For now, only leaf nodes (no recipe) are added to accumulatedResources.

        return {
            name: displayName,
            rate: targetRatePerMin,
            machines: machinesNeededCeil,
            machinesExact: machinesNeededDecimal,
            machineName: recipe.machine,
            children: children.length > 0 ? children : null
        };
    }

    function renderTree(rootItemKey) {
        treeContainer.innerHTML = '';
        resourceList.innerHTML = '';

        const width = treeContainer.clientWidth;
        const containerHeight = treeContainer.clientHeight;

        const rootRecipe = recipes[rootItemKey];
        let targetRate = 60; // Default fallback

        // Calculate Target Rate based on 1 Machine of the Root Item
        if (rootRecipe) {
            const time = rootRecipe.time || 1;
            const output = rootRecipe.outputCount || 1;
            // 1 Machine Rate:
            targetRate = (60 / time) * output;
        }

        const accumulatedResources = {};

        const data = buildTreeData(rootItemKey, targetRate, accumulatedResources);

        // Show Resource Summary
        if (Object.keys(accumulatedResources).length > 0) {
            resourceSummary.style.display = 'block';
            for (const [name, qty] of Object.entries(accumulatedResources)) {
                const div = document.createElement('div');
                div.className = 'resource-item';
                div.innerHTML = `<span>${name}</span> <span>${qty.toFixed(1)} / min</span>`;
                resourceList.appendChild(div);
            }
        } else {
            resourceSummary.style.display = 'none';
        }

        const root = d3.hierarchy(data);

        // Dynamic height
        const leafCount = root.leaves().length;
        const totalHeight = Math.max(containerHeight, leafCount * 140);

        const svg = d3.select("#tree-container").append("svg")
            .attr("width", width)
            .attr("height", containerHeight);

        const g = svg.append("g");

        const zoom = d3.zoom().scaleExtent([0.1, 5]).on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

        svg.call(zoom);

        const treeWidth = width - 450;
        const treeLayout = d3.tree()
            .size([totalHeight - 160, treeWidth])
            .separation((a, b) => (a.parent === b.parent ? 1.6 : 3.0));

        treeLayout(root);

        const getX = d => treeWidth - d.y;

        // Links
        const link = g.selectAll(".link-group")
            .data(root.links())
            .enter().append("g")
            .attr("class", "link-group");

        link.append("path")
            .attr("class", "link")
            .attr("d", d3.linkHorizontal()
                .x(d => getX(d))
                .y(d => d.x));

        // Edge Labels
        link.filter(d => d.target.data.edgeMeta !== undefined)
            .append("text")
            .attr("class", "link-label")
            .attr("dy", -5)
            .attr("text-anchor", "middle")
            .attr("transform", d => {
                const x = (getX(d.source) + getX(d.target)) / 2;
                const y = (d.source.x + d.target.x) / 2;
                return `translate(${x},${y})`;
            })
            .text(d => `${d.target.data.edgeMeta.rate.toFixed(1)}/min`);

        // Nodes
        const node = g.selectAll(".node")
            .data(root.descendants())
            .enter().append("g")
            .attr("class", d => "node " + (d.children ? "node--internal" : "node--leaf"))
            .attr("transform", d => `translate(${getX(d)},${d.x})`);

        node.append("circle")
            .attr("r", 6);

        const text = node.append("text")
            .attr("dy", -5)
            .attr("x", d => d.children ? 15 : -15)
            .attr("text-anchor", d => d.children ? "start" : "end");

        // Machine Label (Now the Title)
        if (d3.some(root.descendants(), d => d.data.machines > 0)) {
            text.append("tspan")
                .attr("x", d => d.children ? 15 : -15)
                .style("font-weight", "700")
                .style("font-size", "14px")
                .style("fill", "var(--accent-color)")
                .text(d => {
                    if (d.data.machines > 0) {
                        return `${d.data.machines} x ${d.data.machineName}`;
                    }
                    return ""; // Placeholder if no machine (will be filled by item name if we want, but logic separates them)
                });
        }

        // Item Name (Now Subtitle)
        text.append("tspan")
            .attr("x", d => d.children ? 15 : -15)
            .attr("dy", "1.3em")
            .attr("class", "item-label") // Added class for easier styling if needed
            .style("font-size", "12px")
            .style("fill", "var(--text-secondary)") // Muted color for subtitle
            .text(d => d.data.name);

        // Rate
        text.append("tspan")
            .attr("x", d => d.children ? 15 : -15)
            .attr("dy", "1.3em")
            .attr("class", "rate-label")
            .style("fill", "#64748b") // Even more muted
            .style("font-size", "10px")
            .text(d => `Rate: ${d.data.rate.toFixed(1)} / min`);

        // Auto-center root on right
        const initialX = width - 180;
        const initialY = containerHeight / 2;
        svg.call(zoom.transform, d3.zoomIdentity.translate(initialX - getX(root), initialY - root.x).scale(0.8));
    }

    // Resize handler
    window.addEventListener('resize', () => {
        const val = itemSelect.value;
        if (val) renderTree(val);
    });
});
