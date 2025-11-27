// main.js
const mainSvg = d3.select("#main-svg");
const minimapSvg = d3.select("#minimap");
const width = window.innerWidth;
const height = window.innerHeight;

// 從後端載入資料
d3.json("/get_van_gogh_data")
  .then((data) => {
    // 計算 x 和 y 的範圍
    const xExtent = d3.extent(data, (d) => d.x);
    const yExtent = d3.extent(data, (d) => d.y);

    // 主畫布的縮放比例
    const xScale = d3
      .scaleLinear()
      .domain(xExtent)
      .range([50, width - 50]);
    const yScale = d3
      .scaleLinear()
      .domain(yExtent)
      .range([50, height - 50]);

    // 定義縮放行為
    const zoom = d3.zoom().scaleExtent([0.5, 10]).on("zoom", zoomed);

    mainSvg.call(zoom);

    // 主畫布的容器
    const g = mainSvg.append("g");

    // 根據 class_name 分配顏色
    const uniqueClassNames = [...new Set(data.map((d) => d.class_name))]; // 提取所有獨特的 class_name
    const colorScale = d3
      .scaleOrdinal()
      .domain(uniqueClassNames)
      .range(d3.schemeSet3); // 使用 D3 的預設顏色方案

    const imageGroup = g
      .selectAll("g.image-group")
      .data(data)
      .enter()
      .append("g")
      .attr("class", "image-group");

    // 加邊框用 rect
    imageGroup
      .append("rect")
      .attr("x", (d) => {
        d.x0 = xScale(d.x) - 15;
        return d.x0;
      })
      .attr("y", (d) => {
        d.y0 = yScale(d.y) - 15;
        return d.y0;
      })
      .attr("width", (d) => {
        d.w0 = 30;
        return d.w0;
      })
      .attr("height", (d) => {
        d.h0 = 30;
        return d.h0;
      })
      .attr("stroke", (d) => colorScale(d.class_name))
      .attr("stroke-width", 1.5)
      .attr("fill", (d) => colorScale(d.class_name))
      .attr("fill-opacity", 0.6)
      .attr("rx", 2)
      .attr("ry", 2);

    // 疊上圖片
    imageGroup
      .append("image")
      .attr("xlink:href", (d) => d.image_url)
      .attr("x", (d) => d.x0)
      .attr("y", (d) => d.y0)
      .attr("width", (d) => d.w0)
      .attr("height", (d) => d.h0)
      .on("mouseover", function (event, d) {
        d3.select(this.parentNode).raise(); // 讓整組往上
        d3.select(this)
          .transition()
          .duration(200)
          .attr("x", d.x0 - 5)
          .attr("y", d.y0 - 5)
          .attr("width", d.w0 + 10)
          .attr("height", d.h0 + 10);
        d3.select(this.previousSibling)
          .transition()
          .duration(200)
          .attr("x", d.x0 - 10)
          .attr("y", d.y0 - 10)
          .attr("width", d.w0 + 20)
          .attr("height", d.h0 + 20);
      })
      .on("mouseout", function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("x", d.x0)
          .attr("y", d.y0)
          .attr("width", d.w0)
          .attr("height", d.h0);
        d3.select(this.previousSibling)
          .transition()
          .duration(200)
          .attr("x", d.x0)
          .attr("y", d.y0)
          .attr("width", d.w0)
          .attr("height", d.h0);
      })
      .on("click", function (event, d) {
        const popup = d3.select("#popup");
        const color = colorScale(d.class_name);

        popup.style("background-color", color);
        popup.style("display", "block");
        d3.select("#popup-image").attr("src", d.image_url);

        // 以更通用的方式提取檔案名稱
        const fileName = d.image_url
          .split("/")
          .pop()
          .split(".")[0]; // 獲取不含副檔名的檔案名稱

        d3.select("#popup-info").html(`
          <li>Name: ${fileName}</li>
          <li>Author: ${d.author}</li>
          <li>Class: ${d.class_name}</li>
          <li>Labels: ${d.labels}</li>
        `);
        event.stopPropagation();
      });

    // --- 計算並繪製群組中心點 ---
    
    // 1. 按作者分組並計算中心點
    const groupedData = d3.group(data, d => d.author);
    const centroidData = Array.from(groupedData, ([author, values]) => ({
      author: author,
      x: d3.mean(values, d => d.x),
      y: d3.mean(values, d => d.y)
    }));

    // 2. 繪製中心點
    const centroidGroup = g.selectAll("g.centroid-group")
      .data(centroidData)
      .enter()
      .append("g")
      .attr("class", "centroid-group");

    // 中心點的背景圓
    centroidGroup.append("circle")
      .attr("cx", d => xScale(d.x))
      .attr("cy", d => yScale(d.y))
      .attr("r", 30) // 中心點圓圈半徑
      .style("fill", d => colorScale(d.author))
      .style("fill-opacity", 0.2)
      .style("stroke", d => colorScale(d.author))
      .style("stroke-width", 2);

    // 中心點的作者文字
    centroidGroup.append("text")
      .attr("x", d => xScale(d.x))
      .attr("y", d => yScale(d.y))
      .attr("text-anchor", "middle")
      .attr("dy", ".35em") // 垂直居中
      .text(d => d.author)
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .style("pointer-events", "none"); // 讓文字不影響滑鼠事件


    // --- 互動式篩選圖例 ---

    // 取得所有作者 (與 class_name 相同)
    const allAuthors = [...new Set(data.map(d => d.author))].sort();

    // 選擇 HTML 容器
    const legendContainer = d3.select("#legend-container");

    // 為每位作者建立一個圖例項目
    const legendItems = legendContainer.selectAll(".legend-item")
      .data(allAuthors)
      .enter()
      .append("div")
      .attr("class", "legend-item");

    // 加入複選框
    legendItems.append("input")
      .attr("type", "checkbox")
      .attr("id", d => `checkbox-${d}`)
      .attr("value", d => d)
      .property("checked", true) // 預設全選
      .on("change", filterPoints); // 綁定事件

    // 加入顏色方塊
    legendItems.append("span")
      .attr("class", "legend-color-box")
      .style("background-color", d => colorScale(d));

    // 加入作者名稱標籤
    legendItems.append("label")
      .attr("for", d => `checkbox-${d}`)
      .text(d => d);

    // --- 控制項事件監聽 ---
    
    // 中心點顯示切換
    d3.select("#toggle-centroids").on("change", filterPoints);

    function filterPoints() {
      // 取得所有被選中的作者
      const checkedAuthors = [];
      legendContainer.selectAll("input[type=checkbox]").each(function(d) {
        if (d3.select(this).property("checked")) {
          checkedAuthors.push(d);
        }
      });

      // 檢查中心點的顯示開關是否開啟
      const areCentroidsVisible = d3.select("#toggle-centroids").property("checked");

      // 根據選中的作者，更新主畫布上的圖片可見性
      g.selectAll(".image-group")
        .style("display", d => checkedAuthors.includes(d.author) ? "block" : "none");
      
      // 更新中心點的可見性 (需要同時考慮作者篩選和總開關)
      g.selectAll(".centroid-group")
        .style("display", d => (checkedAuthors.includes(d.author) && areCentroidsVisible) ? "block" : "none");

      // 同時更新小地圖上的點的可見性
      minimapSvg.selectAll("circle")
        .style("display", d => checkedAuthors.includes(d.author) ? "inline" : "none");
    }


    // --- 搜尋功能 ---
    d3.select("#search-box").on("input", function() {
      const searchTerm = this.value.toLowerCase();

      // 過渡效果，使不符合的項目變暗
      g.selectAll(".image-group").each(function(d) {
        const isMatch = d.author.toLowerCase().includes(searchTerm) || 
                        d.image_url.toLowerCase().includes(searchTerm);
        
        d3.select(this)
          .transition().duration(200)
          .style("opacity", isMatch || searchTerm === "" ? 1.0 : 0.1);
      });

      minimapSvg.selectAll("circle").each(function(d) {
        const isMatch = d.author.toLowerCase().includes(searchTerm) || 
                        d.image_url.toLowerCase().includes(searchTerm);

        d3.select(this)
          .transition().duration(200)
          .style("opacity", isMatch || searchTerm === "" ? 1.0 : 0.1);
      });
    });


    // 小地圖的縮放比例
    const minimapScale = 0.2;
    const minimapWidth = 200;
    const minimapHeight = 150;

    const minimapXScale = d3
      .scaleLinear()
      .domain(xExtent)
      .range([0, minimapWidth]);
    const minimapYScale = d3
      .scaleLinear()
      .domain(yExtent)
      .range([0, minimapHeight]);

    // 繪製小地圖的點
    minimapSvg
      .selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", (d) => minimapXScale(d.x))
      .attr("cy", (d) => minimapYScale(d.y))
      .attr("r", 2)
      .attr("fill", (d) => colorScale(d.class_name));

    // 小地圖的視圖框
    const viewRect = minimapSvg
      .append("rect")
      .attr("fill", "none")
      .attr("stroke", "red")
      .attr("stroke-width", 1);

    // 縮放與平移事件
    function zoomed(event) {
      const transform = event.transform;
      g.attr("transform", transform);

      // 更新小地圖視圖框
      const k = transform.k;
      const tx = transform.x;
      const ty = transform.y;
      viewRect
        .attr("x", (-tx / k) * minimapScale)
        .attr("y", (-ty / k) * minimapScale)
        .attr("width", (width / k) * minimapScale)
        .attr("height", (height / k) * minimapScale);
    }

    // 關閉彈出視窗
    d3.select("#close-popup").on("click", function (event) {
      d3.select("#popup").style("display", "none");
      event.stopPropagation();
    });

    d3.select("body").on("click", function (event) {
      const popup = d3.select("#popup").node();
      if (popup.style.display === "block" && !popup.contains(event.target)) {
        d3.select("#popup").style("display", "none");
      }
    });
  })
  .catch((error) => console.error("Error loading data:", error));
