"use strict";
/*
hide non k-shell if starting core is more than 1
force directed layoutt -explore alt?
color node as it goes ( start with white)
setting - to show not yet visualized current core nodes
add edge! deature  (bonus during visualzation)

*/
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class Color {
    constructor(r, g, b, a = 255) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = 255;
    }
    validate() {
        this.r = Math.max(0, Math.min(this.r, 255));
        this.g = Math.max(0, Math.min(this.g, 255));
        this.b = Math.max(0, Math.min(this.b, 255));
        this.a = Math.max(0, Math.min(this.a, 255));
        return this;
    }
    toString(a) {
        return `rgb(${this.r},${this.g},${this.b},${a == undefined ? this.a : a})`;
    }
    toHexa() {
        return `#${Color.toHexaHelper(this.r)}${Color.toHexaHelper(this.g)}${Color.toHexaHelper(this.b)}`;
    }
    static toHexaHelper(val) {
        let first = Math.floor(val).toString(16);
        if (first.length <= 1) {
            return `0${first}`;
        }
        else {
            return first;
        }
    }
    assignFrom(other) {
        this.r = other.r;
        this.g = other.g;
        this.b = other.b;
        this.a = other.a;
        return this;
    }
    clone() {
        return new Color(this.r, this.g, this.b, this.a);
    }
    static fromString(val) {
        let r, g, b, a;
        if (val[0].startsWith("#")) {
            if (val.length == 7) {
                r = parseInt(val.substring(1, 3), 16);
                g = parseInt(val.substring(3, 5), 16);
                b = parseInt(val.substring(5, 7), 16);
                a = 255;
            }
            else if (val.length == 9) {
                r = parseInt(val.substring(1, 3), 16);
                g = parseInt(val.substring(3, 5), 16);
                b = parseInt(val.substring(5, 7), 16);
                a = parseInt(val.substring(7, 9), 16);
            }
            else {
                return new Color(-1, -1, -1);
            }
        }
        else if (val.startsWith("rgb(")) {
            const numbers = val.split(/\d+/g).map((val) => parseFloat(val));
            if (numbers.length == 3) {
                r = numbers[0];
                g = numbers[1];
                b = numbers[2];
                a = 255;
            }
            else if (numbers.length == 4) {
                r = numbers[0];
                g = numbers[1];
                b = numbers[2];
                a = numbers[3];
            }
            else {
                return new Color(-1, -1, -1);
            }
        }
        else {
            return new Color(-1, -1, -1);
        }
        return new Color(r, g, b, a).validate();
    }
    static lerp(ret, start, end, t) {
        ret.r = start.r * (1 - t) + end.r * t;
        ret.g = start.g * (1 - t) + end.g * t;
        ret.b = start.b * (1 - t) + end.b * t;
        ret.a = start.a * (1 - t) + end.a * t;
    }
}
var KCoreAlgorithm;
(function (KCoreAlgorithm) {
    class ConnectedComponent {
        constructor(shell = 1) {
            this.vertices = [];
            this.shell = -1;
            this.polygonOpacity = 0.4;
            this.polygon = null;
            this.shell = shell;
        }
    }
    KCoreAlgorithm.ConnectedComponent = ConnectedComponent;
    class ShellComponet {
        constructor() {
            this.connectedComponents = [];
            this.shell = -1;
            this.color = new Color(0, 0, 0);
        }
    }
    KCoreAlgorithm.ShellComponet = ShellComponet;
    class ConnectedComponetInfo {
        constructor(s, i) {
            this.shell = 0;
            this.index = 0;
            this.shell = s;
            this.index = i;
        }
    }
    class KCore extends GraphAlgorithm.Algorithm {
        constructor(g, svg) {
            super(g);
            this.shellComponents = [];
            this.opacity = "0.3";
            /******************helper data structures*****************/
            this.degrees = new Map();
            this.inSet1 = new Map();
            this.set0 = [];
            this.set1 = [];
            this.unionFind = new UnionFind();
            this.vertexToInfo = new Map();
            /******************visualization control******************/
            this.IsAnimationRunning = () => this.isAnimating;
            this.maxOption = null;
            this.minOption = null;
            this.state_currentShell = 0;
            this.svgContainer = svg;
        }
        setGraph(g) {
            this.graph = g;
            this.preprocess();
            return this;
        }
        setColor(start, end) {
            const color0 = Color.fromString(start);
            const color1 = Color.fromString(end);
            const shellCount = this.shellComponents.length;
            const interval = shellCount - 1;
            for (let i = 0; i < shellCount; ++i) {
                Color.lerp(this.shellComponents[i].color, color0, color1, i / interval);
            }
            return this;
        }
        preprocess() {
            var _a;
            this.unionFind.set(this.graph.vertices.length);
            for (const sc of this.shellComponents) {
                for (const cc of sc.connectedComponents) {
                    (_a = cc.polygon) === null || _a === void 0 ? void 0 : _a.remove();
                }
            }
            this.shellComponents.length = 0;
            this.vertexToInfo.clear();
            this.clearHelpers();
            let currentShell = 0, nextShell = 1;
            this.graph.adjacencyList.forEach((vl, k) => {
                if (vl.others.length <= 0) {
                    this.set0.push(k);
                    this.degrees.set(k, -1);
                }
                else {
                    this.inSet1.set(k, this.set1.length);
                    this.set1.push(k);
                    this.degrees.set(k, vl.others.length);
                    nextShell = Math.min(nextShell, vl.others.length);
                }
                this.vertexToInfo.set(vl.main.id, new ConnectedComponetInfo(0, 0));
            });
            while (true) {
                while (this.set0.length > 0) {
                    const v_id = this.set0.pop();
                    const vl = this.graph.adjacencyList.get(v_id);
                    this.vertexToInfo.get(v_id).shell = currentShell;
                    for (const neighbor of vl.others) {
                        let degree = this.degrees.get(neighbor);
                        if (degree < 0) {
                            if (this.vertexToInfo.get(neighbor).shell == currentShell) {
                                this.unionFind.union(neighbor, v_id);
                            }
                            continue;
                        }
                        --degree;
                        if (degree <= currentShell) {
                            this.removeFromSet1(neighbor);
                        }
                        else {
                            nextShell = Math.min(nextShell, degree);
                            this.degrees.set(neighbor, degree);
                        }
                    }
                }
                currentShell = nextShell;
                if (this.set1.length <= 0) {
                    break;
                }
                nextShell = currentShell + 1;
                for (let i = 0; i < this.set1.length;) {
                    const d = this.degrees.get(this.set1[i]);
                    if (d <= currentShell) {
                        this.removeFromSet1(this.set1[i]);
                    }
                    else {
                        ++i;
                    }
                }
            }
            for (let i = 0; i < currentShell; ++i) {
                this.shellComponents.push(new ShellComponet());
                this.shellComponents[i].shell = i;
            }
            this.degrees.clear();
            this.unionFind.flatten();
            for (let node = 0; node < this.unionFind.parents.length; ++node) {
                if (node != this.unionFind.parents[node])
                    continue;
                const info = this.vertexToInfo.get(node);
                const sc = this.shellComponents[info.shell].connectedComponents;
                const cc = new ConnectedComponent(info.shell);
                info.index = sc.length;
                cc.vertices.push(this.graph.adjacencyList.get(node).main);
                sc.push(cc);
            }
            for (let node = 0; node < this.unionFind.parents.length; ++node) {
                if (node == this.unionFind.parents[node])
                    continue;
                const parentInfo = this.vertexToInfo.get(this.unionFind.parents[node]);
                this.shellComponents[parentInfo.shell].connectedComponents[parentInfo.index].vertices.push(this.graph.adjacencyList.get(node).main);
                this.vertexToInfo.get(node).index = parentInfo.index;
            }
            return this;
        }
        start(onEnd) {
            return __awaiter(this, void 0, void 0, function* () {
                if (this.isAnimating) {
                    return;
                }
                this.isAnimating = true;
                this.isPause = this.stopAnimating = this.nextStep = false;
                for (const v of this.graph.vertices) {
                    v.circle.setAttribute("opacity", this.opacity);
                }
                this.setAllVerticesColor(true);
                this.hideVerticesOutsideShells();
                yield this.animate();
                for (const v of this.graph.vertices) {
                    v.circle.setAttribute("opacity", "1");
                }
                ;
                this.isPause = this.isAnimating = this.stopAnimating = this.nextStep = false;
                this.displayVerticesInRange(0, this.shellComponents.length, true);
                onEnd === null || onEnd === void 0 ? void 0 : onEnd.call(null);
            });
        }
        stop() {
            this.stopAnimating = true;
        }
        animate() {
            return __awaiter(this, void 0, void 0, function* () {
                this.clearHelpers();
                let currentShell = 0, nextShell = 1;
                this.graph.adjacencyList.forEach((vl, k) => {
                    if (vl.others.length <= 0) {
                        this.set0.push(k);
                        this.degrees.set(k, -1);
                    }
                    else {
                        this.inSet1.set(k, this.set1.length);
                        this.set1.push(k);
                        this.degrees.set(k, vl.others.length);
                        nextShell = Math.min(nextShell, vl.others.length);
                    }
                });
                while (true) {
                    while (this.set0.length > 0) {
                        const v_id = this.set0.pop();
                        const vl = this.graph.adjacencyList.get(v_id);
                        this.degrees.set(v_id, KCore.processed);
                        vl.main.circle.setAttribute("opacity", "1");
                        vl.main.setColor(this.shellComponents[currentShell].color);
                        yield this.wait(currentShell);
                        if (this.stopAnimating) {
                            return;
                        }
                        for (const neighbor of vl.others) {
                            let degree = this.degrees.get(neighbor);
                            if (degree < 0) {
                                continue;
                            }
                            const neighbor_v = this.graph.adjacencyList.get(neighbor).main;
                            neighbor_v.circle.setAttribute("opacity", "1");
                            if (this.stopAnimating) {
                                return;
                            }
                            yield this.wait(currentShell);
                            if (this.stopAnimating) {
                                return;
                            }
                            --degree;
                            if (degree <= currentShell) {
                                this.removeFromSet1(neighbor);
                            }
                            else {
                                nextShell = Math.min(nextShell, degree);
                                this.degrees.set(neighbor, degree);
                            }
                            neighbor_v.circle.setAttribute("opacity", this.opacity);
                            yield this.wait(currentShell);
                            if (this.stopAnimating) {
                                return;
                            }
                        }
                        vl.main.circle.setAttribute("opacity", this.opacity);
                    }
                    if (this.stopAnimating) {
                        return;
                    }
                    currentShell = nextShell;
                    if (this.set1.length <= 0) {
                        break;
                    }
                    nextShell = currentShell + 1;
                    for (let i = 0; i < this.set1.length;) {
                        const d = this.degrees.get(this.set1[i]);
                        if (d <= currentShell) {
                            this.removeFromSet1(this.set1[i]);
                        }
                        else {
                            ++i;
                        }
                    }
                }
            });
        }
        wait(currentShell) {
            const _super = Object.create(null, {
                waitfor: { get: () => super.waitfor }
            });
            return __awaiter(this, void 0, void 0, function* () {
                if (currentShell >= parseInt(this.minOption.value) && currentShell <= parseInt(this.maxOption.value)) {
                    yield _super.waitfor.call(this);
                }
                this.nextStep = false;
            });
        }
        removeFromSet1(target) {
            this.set0.push(target);
            this.degrees.set(target, -1);
            const last = this.set1[this.set1.length - 1];
            const idx = this.inSet1.get(target);
            this.inSet1.delete(target);
            this.set1[idx] = last;
            this.inSet1.set(last, idx);
            this.set1.pop();
        }
        clearHelpers() {
            this.degrees.clear();
            this.inSet1.clear();
            this.set0.length = 0;
            this.set1.length = 0;
        }
        setSelects(min, max) {
            this.minOption = min;
            this.maxOption = max;
            this.createOptions(0, this.shellComponents.length, this.minOption);
            this.createOptions(0, this.shellComponents.length, this.maxOption);
            this.minOption.addEventListener("input", () => {
                this.createOptions(parseInt(this.minOption.value), this.shellComponents.length, this.maxOption);
            });
            this.maxOption.addEventListener("input", () => {
                this.createOptions(0, parseInt(this.maxOption.value) + 1, this.minOption);
            });
            this.minOption.value = "0";
            this.maxOption.value = (this.shellComponents.length - 1).toString();
            return this;
        }
        createOptions(start, end, select) {
            const val = parseInt(select.value);
            select.innerHTML = "";
            for (let i = start; i < end; ++i) {
                select.innerHTML += `
                <option value="${i}">${i}</option>
                `;
            }
            select.value = Math.max(start, Math.min(end - 1, val)).toString();
        }
        setAllVerticesColor(defaultColor) {
            var _a, _b;
            if (defaultColor) {
                for (const v of this.graph.vertices) {
                    v.circle.setAttribute("fill", "var(--reverse-color2)");
                }
                for (const sc of this.shellComponents) {
                    for (const cc of sc.connectedComponents) {
                        (_a = cc.polygon) === null || _a === void 0 ? void 0 : _a.setAttribute("visibility", "hidden");
                    }
                }
            }
            else {
                for (const sc of this.shellComponents) {
                    for (const cc of sc.connectedComponents) {
                        (_b = cc.polygon) === null || _b === void 0 ? void 0 : _b.setAttribute("fill", sc.color.toString(cc.polygonOpacity));
                        for (const v of cc.vertices) {
                            v.setColor(sc.color);
                        }
                    }
                }
            }
            return this;
        }
        displayVerticesInRange(minShell, maxShell, visibile) {
            for (let i = minShell; i < maxShell; ++i) {
                const sc = this.shellComponents[i];
                for (const cc of sc.connectedComponents) {
                    for (const v of cc.vertices) {
                        this.graph.displayVertex(v.id, visibile);
                    }
                }
            }
            return this;
        }
        displayPartialResult(show) {
            const min = parseInt(this.minOption.value), max = parseInt(this.maxOption.value);
            if (show) {
                for (let shell = min; shell <= max; ++shell) {
                    const sc = this.shellComponents[shell];
                    for (const cc of sc.connectedComponents) {
                        for (const v of cc.vertices) {
                            v.setColor(sc.color);
                        }
                    }
                }
            }
            else {
                for (const v of this.graph.vertices) {
                    if (this.degrees.get(v.id) != KCore.processed) {
                        v.circle.setAttribute("fill", "var(--reverse-color2)");
                    }
                }
            }
            return this;
        }
        hideVerticesOutsideShells() {
            const min = parseInt(this.minOption.value), max = parseInt(this.maxOption.value);
            this.displayVerticesInRange(min, max + 1, true); //set the edges visible first (some edge may connected to outside shell)
            this.displayVerticesInRange(0, min, false); //then for the edge connected to outside shell, hide them
            this.displayVerticesInRange(max + 1, this.shellComponents.length, false);
        }
        displayPolygons(show) {
            const value = show ? "visible" : "hidden";
            for (const sc of this.shellComponents) {
                for (const cc of sc.connectedComponents) {
                    if (cc.vertices.length < 3) {
                        continue;
                    }
                    else {
                        this.setPolygon(cc, sc);
                        cc.polygon.setAttribute("visibility", value);
                    }
                }
            }
            return this;
        }
        refreshPolygons(vertex) {
            const info = this.vertexToInfo.get(vertex.id);
            const cc = this.shellComponents[info.shell].connectedComponents[info.index];
            ConvesHull.Solve(cc, this.svgContainer);
        }
        addEdge(a, b) {
            if (this.graph.addEdge(a, b) == false) {
                return this;
            }
            const a_idx = this.vertexToInfo.get(a);
            const b_idx = this.vertexToInfo.get(b);
            let theInfo;
            if (a_idx.shell != b_idx.shell) {
                if (a_idx.shell > b_idx.shell) {
                    theInfo = b_idx;
                }
                else {
                    theInfo = a_idx;
                }
            }
            else {
                if (a_idx.index != b_idx.index) {
                    this.mergeComponent(this.shellComponents[a_idx.shell], a_idx.index, b_idx.index);
                }
                theInfo = a_idx;
            }
            this.KCore_ConnectedComponent(theInfo);
            return this;
        }
        removeEdge(a, b) {
            if (this.graph.removeEdge(a, b) == false) {
                return this;
            }
            const a_idx = this.vertexToInfo.get(a);
            const b_idx = this.vertexToInfo.get(b);
            let theInfo;
            if (a_idx.shell != b_idx.shell) {
                if (a_idx.shell > b_idx.shell) { //higher shell not affacted by lower shell vertex
                    theInfo = b_idx;
                }
                else {
                    theInfo = a_idx;
                }
            }
            else { //they must be in the same connected component
                theInfo = a_idx;
            }
            this.KCore_ConnectedComponent(theInfo);
            return this;
        }
        removeComponent(shellComponent, idx, setIndex = false) {
            var _a;
            const last = shellComponent.connectedComponents[shellComponent.connectedComponents.length - 1];
            const ret = shellComponent.connectedComponents[idx];
            if (setIndex) {
                for (const v of last.vertices) {
                    const ccIdx = this.vertexToInfo.get(v.id);
                    ccIdx.index = idx;
                } //set the last first, just in case last==idx1, all indices of vertices will still be correctly setted after this
            }
            shellComponent.connectedComponents[idx] = last;
            shellComponent.connectedComponents.pop();
            (_a = ret.polygon) === null || _a === void 0 ? void 0 : _a.remove();
            return ret;
        }
        mergeComponent(shellComponent, idx0, idx1) {
            if (idx0 > idx1) {
                const temp = idx0;
                idx0 = idx1;
                idx1 = temp;
            }
            const a = shellComponent.connectedComponents[idx0];
            const b = this.removeComponent(shellComponent, idx1, true);
            for (const v of b.vertices) {
                a.vertices.push(v);
                const ccIdx = this.vertexToInfo.get(v.id);
                ccIdx.index = idx0;
            }
        }
        KCore_ConnectedComponent(theInfo) {
            const cc = this.shellComponents[theInfo.shell].connectedComponents[theInfo.index];
            this.unionFind.set(this.graph.vertices.length);
            this.clearHelpers();
            let minDegree = Number.MAX_SAFE_INTEGER;
            const orginalShell = theInfo.shell; //copy the shell, since info will be change while iteration
            for (const v of cc.vertices) {
                let d = 0;
                for (const other of v.list.others) {
                    if (this.vertexToInfo.get(other).shell >= cc.shell) {
                        ++d;
                    }
                }
                this.degrees.set(v.id, d);
                minDegree = Math.min(minDegree, d);
            }
            for (const v of cc.vertices) {
                if (this.degrees.get(v.id) <= minDegree) {
                    this.set0.push(v.id);
                    this.degrees.set(v.id, -1);
                }
                else {
                    this.set1.push(v.id);
                }
            }
            let currentShell = minDegree;
            let nextShell = minDegree + 1;
            //atmost 2 iteration after added an edge (degree+1)
            while (true) {
                while (this.set0.length > 0) {
                    const v_id = this.set0.pop();
                    const vl = this.graph.adjacencyList.get(v_id);
                    this.vertexToInfo.get(v_id).shell = currentShell;
                    for (const neighbor of vl.others) {
                        let degree = this.degrees.get(neighbor);
                        if (degree == undefined) {
                            continue;
                        }
                        else if (degree < 0) {
                            if (this.vertexToInfo.get(neighbor).shell == currentShell) {
                                this.unionFind.union(neighbor, v_id);
                            }
                            continue;
                        }
                        --degree;
                        if (degree <= currentShell) {
                            this.removeFromSet1(neighbor);
                        }
                        else {
                            nextShell = Math.min(nextShell, degree);
                            this.degrees.set(neighbor, degree);
                        }
                    }
                }
                if (this.set1.length <= 0) {
                    break;
                }
                currentShell = nextShell;
                nextShell = currentShell + 1;
                for (let i = 0; i < this.set1.length;) {
                    const d = this.degrees.get(this.set1[i]);
                    if (d <= currentShell) {
                        this.removeFromSet1(this.set1[i]);
                    }
                    else {
                        ++i;
                    }
                }
            }
            this.degrees.clear();
            if (minDegree == currentShell && minDegree == orginalShell) {
                return; //no new shell is generated in this connected component
            }
            this.unionFind.flatten();
            this.removeComponent(this.shellComponents[orginalShell], theInfo.index, true); //the index of info did got changed
            //for storing the vertices
            const oldShell = this.set0;
            const newShell = this.set1;
            oldShell.length = 0;
            newShell.length = 0;
            for (const v of cc.vertices) { //separate the vertex into two group depend on if their shell change
                const info = this.vertexToInfo.get(v.id);
                if (info.shell != cc.shell) {
                    newShell.push(v.id);
                    continue;
                }
                else {
                    oldShell.push(v.id);
                    if (v.id != this.unionFind.parents[v.id])
                        continue;
                }
                const sc = this.shellComponents[info.shell].connectedComponents;
                const cc_ = new ConnectedComponent(info.shell);
                info.index = sc.length;
                cc_.vertices.push(v);
                this.setPolygon(cc_, this.shellComponents[info.shell]);
                sc.push(cc_);
            }
            for (const v of oldShell) { //load the vertex that shell doesnt got changed
                if (v == this.unionFind.parents[v])
                    continue;
                const info = this.vertexToInfo.get(v);
                const parentInfo = this.vertexToInfo.get(this.unionFind.parents[v]);
                this.shellComponents[parentInfo.shell].connectedComponents[parentInfo.index].vertices.push(this.graph.adjacencyList.get(v).main);
                info.index = parentInfo.index;
            }
            for (const v of oldShell) { //construct the convex hull
                if (v != this.unionFind.parents[v])
                    continue;
                const info = this.vertexToInfo.get(v);
                ConvesHull.Solve(this.shellComponents[info.shell].connectedComponents[info.index], this.svgContainer);
            }
            //console.log(`new ${newShell}`);
            //console.log(`old ${oldShell}`);
            const otherCCIndices = oldShell;
            let newShellNumber = 0;
            otherCCIndices.length = 0;
            const inNewShell = this.degrees;
            inNewShell.clear();
            for (const v of newShell) {
                inNewShell.set(v, 0);
            }
            for (const v of newShell) {
                const info = this.vertexToInfo.get(v);
                newShellNumber = info.shell;
                const vl = this.graph.adjacencyList.get(v);
                for (const other of vl.others) { //find all connected component on same shell that can merge
                    if (inNewShell.get(other) != undefined) {
                        continue;
                    }
                    const otherInfo = this.vertexToInfo.get(other);
                    if (otherInfo.shell == info.shell) {
                        otherCCIndices.push(otherInfo.index);
                    }
                }
            }
            if (otherCCIndices.length <= 0) { //isolated new core
                const cc = new ConnectedComponent(newShellNumber);
                let index;
                if (newShellNumber > this.shellComponents.length) {
                    const sc = new ShellComponet();
                    sc.shell = newShellNumber;
                    const oldLength = this.shellComponents.length;
                    index = 0;
                    sc.connectedComponents.push(cc);
                    ++this.shellComponents.length;
                    this.shellComponents[newShellNumber] = sc;
                    this.setColor(this.shellComponents[0].color.toString(), this.shellComponents[oldLength].color.toString());
                }
                else {
                    index = this.shellComponents[newShellNumber].connectedComponents.length;
                    this.shellComponents[newShellNumber].connectedComponents.push(cc);
                }
                for (const v of newShell) {
                    cc.vertices.push(this.graph.adjacencyList.get(v).main);
                    this.vertexToInfo.get(v).index = index;
                }
                console.log(cc);
                this.setPolygon(cc, this.shellComponents[newShellNumber]);
                ConvesHull.Solve(cc, this.svgContainer);
            }
            else { //merge the connected component
                otherCCIndices.sort((a, b) => {
                    return a - b;
                });
                {
                    let len = 0;
                    for (let i = 0, j; i < otherCCIndices.length; i = j) {
                        for (j = i + 1; j < otherCCIndices.length && otherCCIndices[i] == otherCCIndices[j]; ++j) { }
                        otherCCIndices[len++] = otherCCIndices[j - 1];
                    }
                    otherCCIndices.length = len;
                }
                const theIndex = otherCCIndices[0];
                const sc = this.shellComponents[newShellNumber];
                const cc = sc.connectedComponents[theIndex];
                for (const v of newShell) {
                    cc.vertices.push(this.graph.adjacencyList.get(v).main);
                    this.vertexToInfo.get(v).index = theIndex;
                }
                //since the remove component will change the order of connectedComponents, so must iterate backward to prevent cc at larger index swap to the front (since remove larger index wrong affect the cc at smaller indices)
                for (let i = otherCCIndices.length - 1; i > 0; --i) {
                    const otherCC = this.removeComponent(sc, otherCCIndices[i]);
                    for (const v of otherCC.vertices) {
                        const info = this.vertexToInfo.get(v.id);
                        info.index = theIndex;
                        cc.vertices.push(v);
                    }
                }
                ConvesHull.Solve(cc, this.svgContainer);
            }
            this.checkCCs();
        }
        setPolygon(cc, sc) {
            if (cc.vertices.length < 3) {
                return;
            }
            if (cc.polygon == undefined) {
                cc.polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                ConvesHull.Solve(cc, this.svgContainer);
                this.svgContainer.insertBefore(cc.polygon, this.svgContainer.firstChild);
            }
            cc.polygon.setAttribute("opacity", "0.3");
            cc.polygon.setAttribute("fill", sc.color.toString());
        }
        checkCCs() {
            for (let shell = 0; shell < this.shellComponents.length; ++shell) {
                const sc = this.shellComponents[shell];
                for (let i = 0; i < sc.connectedComponents.length; ++i) {
                    const cc = sc.connectedComponents[i];
                    for (const v of cc.vertices) {
                        const info = this.vertexToInfo.get(v.id);
                        if (info.shell != shell || info.index != i) {
                            console.log(`fail at ${shell} ${i} of ${v.id} (incorrect values: ${info.shell} ${info.index})`);
                            throw new Error();
                        }
                    }
                }
            }
            for (const v of this.graph.vertices) {
                const info = this.vertexToInfo.get(v.id);
                const cc = this.shellComponents[info.shell].connectedComponents[info.index];
                let have = false;
                for (const _v of cc.vertices) {
                    if (v.id == _v.id) {
                        have = true;
                        break;
                    }
                }
                if (have == false) {
                    console.log(`fail at ${v.id} (incorrect values: ${info.shell} ${info.index})`);
                    throw new Error();
                }
            }
        }
    }
    KCore.processed = -2;
    KCoreAlgorithm.KCore = KCore;
    class Point {
        constructor(x, y) {
            this.x = x;
            this.y = y;
        }
    }
    KCoreAlgorithm.Point = Point;
    class ConvesHull {
        static cross(o, a, b) {
            return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
        }
        static Solve(cc, svg) {
            if (cc.vertices.length < 3) {
                return;
            }
            const polygon = cc.polygon;
            polygon.points.clear();
            if (cc.vertices.length < 4) {
                for (const vertex of cc.vertices) {
                    const p = svg.createSVGPoint();
                    p.x = vertex.x;
                    p.y = vertex.y;
                    polygon.points.appendItem(p);
                }
                return;
            }
            function approximately(a, b) {
                return Math.abs(a - b) < 0.0001;
            }
            cc.vertices.sort((a, b) => {
                if (approximately(a.x, b.x)) {
                    if (approximately(a.y, b.y)) {
                        return 0;
                    }
                    else {
                        return a.y - b.y;
                    }
                }
                else {
                    return a.x - b.x;
                }
            });
            ConvesHull.points.length = 0;
            for (const vertex of cc.vertices) {
                const p = new Point(vertex.x, vertex.y);
                while (ConvesHull.points.length > 1 && ConvesHull.cross(ConvesHull.points[ConvesHull.points.length - 2], ConvesHull.points[ConvesHull.points.length - 1], p) <= 0) {
                    --ConvesHull.points.length;
                }
                ConvesHull.points.push(p);
            }
            const base = ConvesHull.points.length;
            for (let i = cc.vertices.length - 2; i >= 0; --i) {
                const vertex = cc.vertices[i];
                const p = new Point(vertex.x, vertex.y);
                while (ConvesHull.points.length > base && ConvesHull.cross(ConvesHull.points[ConvesHull.points.length - 2], ConvesHull.points[ConvesHull.points.length - 1], p) <= 0) {
                    --ConvesHull.points.length;
                }
                ConvesHull.points.push(p);
            }
            for (const p of ConvesHull.points) {
                const realPoint = svg.createSVGPoint();
                realPoint.x = p.x;
                realPoint.y = p.y;
                polygon.points.appendItem(realPoint);
            }
        }
    }
    ConvesHull.points = [];
    KCoreAlgorithm.ConvesHull = ConvesHull;
})(KCoreAlgorithm || (KCoreAlgorithm = {}));
class UnionFind {
    constructor() {
        this.parents = [];
        this.stack = [];
    }
    set(size) {
        this.parents.length = size;
        for (let i = 0; i < size; ++i) {
            this.parents[i] = i;
        }
        return this;
    }
    union(a, b) {
        const p_a = this.find(a), p_b = this.find(b);
        if (p_a == p_b) {
            return true;
        }
        else {
            this.parents[p_a] = p_b;
            return false;
        }
    }
    find(a) {
        let p = a;
        while (this.parents[p] != p) {
            this.stack.push(p);
            p = this.parents[p];
        }
        while (this.stack.length > 0) {
            const node = this.stack.pop();
            this.parents[node] = p;
        }
        return p;
    }
    flatten() {
        for (let i = 0; i < this.parents.length; ++i) {
            this.parents[i] = this.find(i);
        }
    }
}
function delay(ms) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, _reject) => {
            setTimeout(resolve, ms);
        });
    });
}
