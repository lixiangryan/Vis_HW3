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

    // 繪製圖例
    // 聚合 class_name 對應的 labels
    const classLabelsMap = {};
    data.forEach((d) => {
      if (!classLabelsMap[d.class_name]) {
        classLabelsMap[d.class_name] = new Set();
      }
      classLabelsMap[d.class_name].add(d.labels);
    });

    // 生成 legendData
    const legendData = Object.entries(classLabelsMap).map(
      ([className, labelsSet]) => {
        return {
          className: className,
          labels: [...labelsSet].join(", "),
        };
      }
    );

    // 繪製 legend
    const legend = mainSvg
      .append("g")
      .attr("transform", `translate(${width - 300}, 20)`);

    // legend 背景底色（會先畫，所以在最底層）
    const legendBg = legend
      .append("rect")
      .attr("fill", "white")
      .attr("fill-opacity", 0.8)
      .attr("rx", 8)
      .attr("ry", 8); // ✅ 圓角可選

    legendData.forEach((item, i) => {
      const legendRow = legend
        .append("g")
        .attr("transform", `translate(0, ${i * 20})`);

      legendRow
        .append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", colorScale(item.className));

      legendRow
        .append("text")
        .attr("x", 20)
        .attr("y", 12)
        .text(`Labels: ${item.labels} - ${item.className}`)
        .style("font-size", "12px");
    });

    const legendBBox = legend.node().getBBox();
    legendBg
      .attr("x", legendBBox.x - 10)
      .attr("y", legendBBox.y - 10)
      .attr("width", legendBBox.width + 20)
      .attr("height", legendBBox.height + 20);

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
