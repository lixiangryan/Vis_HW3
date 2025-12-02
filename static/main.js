// main.js
const mainSvg = d3.select("#main-svg");
const minimapSvg = d3.select("#minimap");
const width = window.innerWidth;
const height = window.innerHeight;

// 全域變數儲存特徵向量 (從 vectors.js 載入)
let featureVectors = window.GLOBAL_VECTORS || {};

if (!window.GLOBAL_VECTORS) {
    console.warn("未檢測到 window.GLOBAL_VECTORS，相似度功能可能無法使用。");
} else {
    console.log("特徵向量載入完成 (from vectors.js)");
}

// 載入主資料 (從 data.js 載入)
const data = window.GLOBAL_DATA || [];

if (data.length === 0) {
    console.error("未檢測到 window.GLOBAL_DATA，請確認 data.js 是否正確載入。");
} else {
    // ===================================
    // 1. 全域變數與初始設定
    // ===================================
    let colorMode = 'author'; // 'author' 或 'cluster_id'

    const xExtent = d3.extent(data, (d) => d.x);
    const yExtent = d3.extent(data, (d) => d.y);
    const xScale = d3.scaleLinear().domain(xExtent).range([50, width - 50]);
    const yScale = d3.scaleLinear().domain(yExtent).range([50, height - 50]);
    const zoom = d3.zoom().scaleExtent([0.5, 10]).on("zoom", zoomed);
    mainSvg.call(zoom);
    const g = mainSvg.append("g");

    // -------------------
    // 主畫布上的圖片點
    // -------------------
    const imageGroup = g.selectAll("g.image-group").data(data).enter().append("g").attr("class", "image-group");
    imageGroup.append("rect")
        .attr("x", d => { d.x0 = xScale(d.x) - 15; return d.x0; })
        .attr("y", d => { d.y0 = yScale(d.y) - 15; return d.y0; })
        .attr("width", 30).attr("height", 30)
        .attr("rx", 2).attr("ry", 2);
    imageGroup.append("image")
        .attr("xlink:href", d => d.image_url)
        .attr("x", d => d.x0).attr("y", d => d.y0)
        .attr("width", 30).attr("height", 30)
        .on("mouseover", function (event, d) {
            d3.select(this.parentNode).raise();
            d3.select(this).transition().duration(200).attr("x", d.x0 - 5).attr("y", d.y0 - 5).attr("width", 40).attr("height", 40);
            d3.select(this.previousSibling).transition().duration(200).attr("x", d.x0 - 10).attr("y", d.y0 - 10).attr("width", 50).attr("height", 50);
        })
        .on("mouseout", function (event, d) {
            d3.select(this).transition().duration(200).attr("x", d.x0).attr("y", d.y0).attr("width", 30).attr("height", 30);
            d3.select(this.previousSibling).transition().duration(200).attr("x", d.x0).attr("y", d.y0).attr("width", 30).attr("height", 30);
        })
        .on("click", function (event, d) {
            // 顯示主彈出視窗
            d3.select("#popup").style("display", "block");
            d3.select("#popup-image").attr("src", d.image_url);
            const fileName = d.image_url.split("/").pop().split(".")[0];
            d3.select("#popup-info").html(`<li>Name: ${fileName}</li><li>Author: ${d.author}</li><li>Cluster ID: ${d.cluster_id}</li>`);
            event.stopPropagation();

            // 在左下角容器顯示相似圖片 (前端計算)
            const similarPaths = getSimilarImages(d.image_path);
            const neighborsData = similarPaths.slice(1).map(path => data.find(item => item.image_path === path)).filter(item => item);
            d3.select("#similarity-results-container").html("").selectAll("img").data(neighborsData).join("img").attr("src", d => d.image_url);
        });

    // -------------------
    // 小地圖
    // -------------------
    const minimapScale = 0.2, minimapWidth = 200, minimapHeight = 150;
    const minimapXScale = d3.scaleLinear().domain(xExtent).range([0, minimapWidth]);
    const minimapYScale = d3.scaleLinear().domain(yExtent).range([0, minimapHeight]);
    const minimapPoints = minimapSvg.selectAll("circle").data(data).enter().append("circle")
        .attr("cx", d => minimapXScale(d.x)).attr("cy", d => minimapYScale(d.y)).attr("r", 2);
    const viewRect = minimapSvg.append("rect").attr("fill", "none").attr("stroke", "red").attr("stroke-width", 1);


    // ===================================
    // 2. 核心更新函式
    // ===================================
    function updateVisualization() {
        const colorKey = colorMode; // 'author' 或 'cluster_id'

        // 2a. 更新顏色比例尺
        const uniqueValues = [...new Set(data.map(d => d[colorKey]))].sort((a, b) => a - b); // 加入數字排序

        // --- DEBUG ---
        console.log("--- UPDATE VISUALIZATION ---");
        console.log("Coloring by:", colorKey);
        console.log("Unique values for coloring:", uniqueValues);
        // --- END DEBUG ---

        const colorScale = d3.scaleOrdinal().domain(uniqueValues).range(d3.schemeSet3);

        // 2b. 更新主畫布點的顏色
        imageGroup.selectAll("rect")
            .transition().duration(500)
            .attr("stroke", d => colorScale(d[colorKey]))
            .attr("fill", d => colorScale(d[colorKey]));

        // 2c. 更新小地圖點的顏色
        minimapPoints.transition().duration(500)
            .attr("fill", d => colorScale(d[colorKey]));

        // 2d. 更新與重繪中心點
        g.selectAll("g.centroid-group").remove(); // 清除舊的中心點
        const groupedData = d3.group(data, d => d[colorKey]);
        const centroidData = Array.from(groupedData, ([key, values]) => ({ key: key, x: d3.mean(values, d => d.x), y: d3.mean(values, d => d.y) }));
        const centroidGroup = g.selectAll("g.centroid-group").data(centroidData).enter().append("g").attr("class", "centroid-group");
        centroidGroup.append("circle")
            .attr("cx", d => xScale(d.x)).attr("cy", d => yScale(d.y))
            .attr("r", 30).style("fill-opacity", 0.2).style("stroke-width", 2)
            .style("fill", d => colorScale(d.key)).style("stroke", d => colorScale(d.key));
        centroidGroup.append("text")
            .attr("x", d => xScale(d.x)).attr("y", d => yScale(d.y))
            .attr("text-anchor", "middle").attr("dy", ".35em").text(d => d.key)
            .style("font-size", "12px").style("font-weight", "bold").style("fill", "#333").style("pointer-events", "none");

        // 2e. 更新與重繪圖例
        const legendContainer = d3.select("#legend-container");
        legendContainer.html(""); // 清除舊圖例
        const legendItems = legendContainer.selectAll(".legend-item").data(uniqueValues).enter().append("div").attr("class", "legend-item");
        legendItems.append("input").attr("type", "checkbox").attr("id", d => `checkbox-${d}`).attr("value", d => d).property("checked", true).on("change", filterPoints);
        legendItems.append("span").attr("class", "legend-color-box").style("background-color", d => colorScale(d));
        legendItems.append("label").attr("for", d => `checkbox-${d}`).text(d => d);

        // 2f. 更新與重繪統計圖表
        const statsContainer = d3.select("#stats-container");
        statsContainer.html(""); // 清除舊圖表
        const counts = Array.from(d3.rollup(data, v => v.length, d => d[colorKey]), ([key, count]) => ({ key, count })).sort((a, b) => d3.descending(a.count, b.count));
        const statsMargin = { top: 30, right: 20, bottom: 100, left: 40 }, statsWidth = 300 - statsMargin.left - statsMargin.right, statsHeight = 250 - statsMargin.top - statsMargin.bottom;
        const statsSvg = statsContainer.append("svg").attr("width", statsWidth + statsMargin.left + statsMargin.right).attr("height", statsHeight + statsMargin.top + statsMargin.bottom).append("g").attr("transform", `translate(${statsMargin.left},${statsMargin.top})`);
        const xStatsScale = d3.scaleBand().domain(counts.map(d => d.key)).range([0, statsWidth]).padding(0.1);
        const yStatsScale = d3.scaleLinear().domain([0, d3.max(counts, d => d.count) * 1.1]).range([statsHeight, 0]);
        statsSvg.selectAll(".bar").data(counts).enter().append("rect").attr("class", "bar").attr("x", d => xStatsScale(d.key)).attr("y", d => yStatsScale(d.count))
            .attr("width", xStatsScale.bandwidth()).attr("height", d => statsHeight - yStatsScale(d.count))
            .attr("fill", d => colorScale(d.key)).style("cursor", "pointer")
            .on("click", (event, d) => {
                legendContainer.selectAll("input[type=checkbox]").property("checked", legend_d => legend_d === d.key);
                filterPoints();
            });
        statsSvg.append("g").attr("transform", `translate(0,${statsHeight})`).call(d3.axisBottom(xStatsScale)).selectAll("text").attr("transform", "rotate(-45)").style("text-anchor", "end");
        statsSvg.append("g").call(d3.axisLeft(yStatsScale).ticks(5))
            .append("text")
            .attr("fill", "#000")
            .attr("transform", "rotate(-90)")
            .attr("y", -statsMargin.left + 5) // 調整位置
            .attr("x", -statsHeight / 2)
            .attr("dy", "1em") // 垂直位移
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .text("作品數量");
        statsSvg.append("text").attr("x", statsWidth / 2).attr("y", 0 - (statsMargin.top / 2)).attr("text-anchor", "middle").style("font-size", "16px").style("font-weight", "bold").text(colorMode === 'author' ? '各作者作品數量' : '各分群作品數量');

        // 觸發一次篩選，確保初始狀態正確
        filterPoints();
    }

    // ===================================
    // 3. 事件監聽與輔助函式
    // ===================================

    // --- 控制項事件監聽 ---
    // 改用原生 JS 來附加事件，以繞過 D3 可能的 bug
    document.getElementById("color-scheme-select").addEventListener("change", function () {
        console.log("--- DROPDOWN CHANGED (Native JS) ---");
        colorMode = this.value;
        updateVisualization();
    });
    d3.select("#toggle-stats").on("change", function () { d3.select("#stats-container").style("display", d3.select(this).property("checked") ? "block" : "none"); });
    d3.select("#toggle-centroids").on("change", filterPoints);
    d3.select("#search-box").on("input", function () {
        const searchTerm = this.value.toLowerCase();
        const colorKey = colorMode;

        // 搜尋只應影響圖片，不應影響中心點
        g.selectAll(".image-group").transition().duration(200).style("opacity", d => {
            if (searchTerm === "") return 1.0;
            const keyMatch = String(d[colorKey]).toLowerCase().includes(searchTerm);
            const imageMatch = d.image_url.toLowerCase().includes(searchTerm);
            return keyMatch || imageMatch ? 1.0 : 0.1;
        });

        minimapSvg.selectAll("circle").transition().duration(200).style("opacity", d => {
            if (searchTerm === "") return 1.0;
            const keyMatch = String(d[colorKey]).toLowerCase().includes(searchTerm);
            const imageMatch = d.image_url.toLowerCase().includes(searchTerm);
            return keyMatch || imageMatch ? 1.0 : 0.1;
        });
    });

    function filterPoints() {
        const legendContainer = d3.select("#legend-container");
        const checkedValues = [];
        legendContainer.selectAll("input[type=checkbox]:checked").each(function (d) { checkedValues.push(d); });
        const areCentroidsVisible = d3.select("#toggle-centroids").property("checked");
        const colorKey = colorMode;

        g.selectAll(".image-group").style("display", d => checkedValues.includes(d[colorKey]) ? "block" : "none");
        g.selectAll(".centroid-group").style("display", d => (checkedValues.includes(d.key) && areCentroidsVisible) ? "block" : "none");
        minimapSvg.selectAll("circle").style("display", d => checkedValues.includes(d[colorKey]) ? "inline" : "none");
    }

    function zoomed(event) {
        g.attr("transform", event.transform);
        const { k, x, y } = event.transform;
        viewRect.attr("x", (-x / k) * minimapScale).attr("y", (-y / k) * minimapScale)
            .attr("width", (width / k) * minimapScale).attr("height", (height / k) * minimapScale);
    }

    d3.select("#close-popup").on("click", function (event) {
        d3.select("#popup").style("display", "none");
        d3.select("#similarity-results-container").html("");
        event.stopPropagation();
    });
    d3.select("body").on("click", function (event) {
        const popup = d3.select("#popup").node();
        if (popup.style.display === "block" && !popup.contains(event.target)) {
            d3.select("#popup").style("display", "none");
            d3.select("#similarity-results-container").html("");
        }
    });

    // --- 相似度計算函式 ---
    function getSimilarImages(targetPath) {
        if (!featureVectors || Object.keys(featureVectors).length === 0) {
            console.warn("特徵向量尚未載入或為空");
            return [];
        }

        const targetVector = featureVectors[targetPath];
        if (!targetVector) {
            console.error("找不到目標圖片的特徵向量:", targetPath);
            return [];
        }

        const distances = [];
        for (const path in featureVectors) {
            const vector = featureVectors[path];
            // 計算歐幾里得距離
            let sum = 0;
            for (let i = 0; i < vector.length; i++) {
                sum += (targetVector[i] - vector[i]) ** 2;
            }
            const dist = Math.sqrt(sum);
            distances.push({ path, dist });
        }

        // 按距離排序
        distances.sort((a, b) => a.dist - b.dist);

        // 取得最相似的 6 個 (包含自己)，然後只回傳圖片路徑
        return distances.slice(0, 6).map(d => d.path);
    }

    // --- 初始繪製 ---
    updateVisualization();
}
