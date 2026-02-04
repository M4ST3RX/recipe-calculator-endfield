document.addEventListener('DOMContentLoaded', () => {
    const itemSelect = document.getElementById('item-select');
    const goalTypeInput = document.getElementById('goal-type');
    const goalValueInput = document.getElementById('goal-value');
    const treeContainer = document.getElementById('tree-container');

    if (typeof recipes === 'undefined') {
        treeContainer.innerHTML = `<div class="empty-state" style="color: #ef4444;">Error: recipes.js not loaded.</div>`;
        return;
    }

    populateDropdown();

    // Refresh tree on input changes
    [goalTypeInput, goalValueInput].forEach(el => {
        el.addEventListener('input', refreshTree);
    });

    function refreshTree() {
        const selectedItemKey = itemSelect.value;
        if (selectedItemKey) {
            renderTree(selectedItemKey);
        }
    }

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

    function buildTreeData(itemKey, targetAmount = 1, factoryTimeWindow = 1) {
        const recipe = recipes[itemKey];

        if (!recipe) {
            const displayName = itemKey.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            return {
                name: displayName,
                needed: targetAmount,
                produced: targetAmount,
                children: null
            };
        }

        const displayName = recipe.name || itemKey;
        const outputQuantity = recipe.outputCount || 1;
        const cycleTime = recipe.time || 1;

        // How many cycles can one machine run in the factory's time window?
        const cyclesPerMachine = factoryTimeWindow / cycleTime;
        const itemsPerMachineInWindow = cyclesPerMachine * outputQuantity;

        // Machines needed to meet TARGET in this window
        const machinesNeeded = Math.ceil(targetAmount / itemsPerMachineInWindow);
        const totalProduced = machinesNeeded * itemsPerMachineInWindow;
        const excess = totalProduced - targetAmount;

        const children = recipe.inputs ? recipe.inputs.map(ing => {
            const totalRequiredIng = machinesNeeded * cyclesPerMachine * ing.count;
            const childNode = buildTreeData(ing.item, totalRequiredIng, factoryTimeWindow);

            childNode.edgeMeta = {
                parentTime: cycleTime,
                qtyPerMachineCycle: ing.count
            };

            return childNode;
        }) : [];

        return {
            name: displayName,
            needed: targetAmount,
            produced: totalProduced,
            excess: excess,
            rate: totalProduced / factoryTimeWindow,
            machines: machinesNeeded,
            machineName: recipe.machine,
            children: children.length > 0 ? children : null
        };
    }

    function renderTree(rootItemKey) {
        treeContainer.innerHTML = '';

        const width = treeContainer.clientWidth;
        const containerHeight = treeContainer.clientHeight;

        const targetAmount = parseFloat(goalValueInput.value) || 1;
        const recipe = recipes[rootItemKey];
        const factoryTimeWindow = recipe ? (recipe.time || 1) : 1;

        const data = buildTreeData(rootItemKey, targetAmount, factoryTimeWindow);
        const root = d3.hierarchy(data);

        // Dynamic height: Avoid overlap
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

        // Edge Labels (Requirement)
        link.filter(d => d.target.data.edgeMeta !== undefined)
            .append("text")
            .attr("class", "link-label")
            .attr("dy", -10)
            .attr("text-anchor", "middle")
            .attr("transform", d => {
                const x = (getX(d.source) + getX(d.target)) / 2;
                const y = (d.source.x + d.target.x) / 2;
                return `translate(${x},${y})`;
            })
            .text(d => {
                const meta = d.target.data.edgeMeta;
                return `${meta.qtyPerMachineCycle}x / cycle`;
            });

        // Nodes
        const node = g.selectAll(".node")
            .data(root.descendants())
            .enter().append("g")
            .attr("class", d => "node " + (d.children ? "node--internal" : "node--leaf"))
            .attr("transform", d => `translate(${getX(d)},${d.x})`);

        node.append("circle")
            .attr("r", 8);

        const text = node.append("text")
            .attr("dy", -5)
            .attr("x", d => d.children ? 15 : -15)
            .attr("text-anchor", d => d.children ? "start" : "end");

        // Labels
        text.append("tspan")
            .attr("x", d => d.children ? 15 : -15)
            .style("font-weight", "600")
            .style("font-size", "14px")
            .text(d => d.data.name);

        text.append("tspan")
            .attr("x", d => d.children ? 15 : -15)
            .attr("dy", "1.3em")
            .attr("class", "rate-label")
            .text(d => `Target: ${d.data.needed.toFixed(1)} | Produced: ${d.data.produced.toFixed(1)}`);

        if (d3.some(root.descendants(), d => d.data.machines)) {
            text.append("tspan")
                .attr("x", d => d.children ? 15 : -15)
                .attr("dy", "1.3em")
                .attr("class", "machine-label")
                .style("fill", "var(--accent-color)")
                .text(d => d.data.machines ? `Machines: ${d.data.machines} × [${d.data.machineName}]` : "");
        }

        text.append("tspan")
            .attr("x", d => d.children ? 15 : -15)
            .attr("dy", "1.3em")
            .style("fill", "#10b981") // Success green
            .style("font-size", "10px")
            .text(d => (d.data.excess > 0) ? `Excess: +${d.data.excess.toFixed(1)}` : "");

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
