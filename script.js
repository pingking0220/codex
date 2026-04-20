const TOTAL_GROUPS = 6;
const SEATS_PER_GROUP = 6;
const TOTAL_ROWS = 6;
const SEATS_PER_ROW = 5;
const STORAGE_KEY = "nature-classroom-seat-plans";

const groupPresetMap = {
  "3-3": { male: 3, female: 3 },
  "3-2": { male: 3, female: 2 },
  "2-2": { male: 2, female: 2 },
  custom: null,
};

const state = {
  students: [],
  mode: "group",
  editingId: null,
  seatAssignments: null,
  currentClassName: "",
  teacherView: false,
  groupSettings: {
    groupCount: 6,
    emptyGroup: "",
    configs: Array.from({ length: TOTAL_GROUPS }, () => ({
      preset: "2-2",
      male: 2,
      female: 2,
    })),
  },
};

const elements = {
  groupModeBtn: document.querySelector("#groupModeBtn"),
  rowModeBtn: document.querySelector("#rowModeBtn"),
  studentForm: document.querySelector("#studentForm"),
  studentId: document.querySelector("#studentId"),
  studentName: document.querySelector("#studentName"),
  studentNumber: document.querySelector("#studentNumber"),
  studentGender: document.querySelector("#studentGender"),
  cancelEditBtn: document.querySelector("#cancelEditBtn"),
  studentList: document.querySelector("#studentList"),
  studentCountBadge: document.querySelector("#studentCountBadge"),
  csvFileInput: document.querySelector("#csvFileInput"),
  csvTextInput: document.querySelector("#csvTextInput"),
  importTextBtn: document.querySelector("#importTextBtn"),
  clearTextBtn: document.querySelector("#clearTextBtn"),
  fillSampleBtn: document.querySelector("#fillSampleBtn"),
  groupCountSelect: document.querySelector("#groupCountSelect"),
  emptyGroupSelect: document.querySelector("#emptyGroupSelect"),
  groupConfigList: document.querySelector("#groupConfigList"),
  groupSettings: document.querySelector("#groupSettings"),
  rowSettings: document.querySelector("#rowSettings"),
  generateBtn: document.querySelector("#generateBtn"),
  shuffleBtn: document.querySelector("#shuffleBtn"),
  classNameInput: document.querySelector("#classNameInput"),
  saveClassBtn: document.querySelector("#saveClassBtn"),
  newClassBtn: document.querySelector("#newClassBtn"),
  savedClassList: document.querySelector("#savedClassList"),
  savedClassCount: document.querySelector("#savedClassCount"),
  messageBox: document.querySelector("#messageBox"),
  seatMap: document.querySelector("#seatMap"),
  seatSummary: document.querySelector("#seatSummary"),
  teacherViewBtn: document.querySelector("#teacherViewBtn"),
  printViewBtn: document.querySelector("#printViewBtn"),
};

const dragState = {
  sourceSeatId: null,
};

initialize();

function initialize() {
  bindEvents();
  renderGroupSelectors();
  renderGroupConfigCards();
  renderStudentList();
  renderSavedClasses();
  renderMode();
  renderSeatMap();
}

function bindEvents() {
  elements.groupModeBtn.addEventListener("click", () => setMode("group"));
  elements.rowModeBtn.addEventListener("click", () => setMode("row"));
  elements.studentForm.addEventListener("submit", handleStudentSubmit);
  elements.cancelEditBtn.addEventListener("click", resetForm);
  elements.csvFileInput.addEventListener("change", handleCsvImport);
  elements.importTextBtn.addEventListener("click", handleTextImport);
  elements.clearTextBtn.addEventListener("click", () => {
    elements.csvTextInput.value = "";
    setMessage("已清空貼上區。");
  });
  elements.fillSampleBtn.addEventListener("click", () => {
    elements.csvTextInput.value = "座號,姓名,性別\n1,王小明,男\n2,林小美,女";
    setMessage("已帶入 CSV 範例。");
  });
  elements.groupCountSelect.addEventListener("change", handleGroupCountChange);
  elements.emptyGroupSelect.addEventListener("change", handleEmptyGroupChange);
  elements.generateBtn.addEventListener("click", () => generateSeats(false));
  elements.shuffleBtn.addEventListener("click", () => generateSeats(true));
  elements.saveClassBtn.addEventListener("click", saveCurrentClass);
  elements.newClassBtn.addEventListener("click", createNewClass);
  elements.teacherViewBtn.addEventListener("click", toggleTeacherView);
  elements.printViewBtn.addEventListener("click", printSeatMap);

  elements.classNameInput.addEventListener("input", () => {
    state.currentClassName = elements.classNameInput.value.trim();
  });
}

function setMode(mode) {
  state.mode = mode;
  elements.groupModeBtn.classList.toggle("active", mode === "group");
  elements.rowModeBtn.classList.toggle("active", mode === "row");
  renderMode();
  clearAssignments(false);
  setMessage(mode === "group" ? "已切換到分組模式。" : "已切換到排列模式。");
}

function renderMode() {
  const isGroup = state.mode === "group";
  elements.groupModeBtn.classList.toggle("active", isGroup);
  elements.rowModeBtn.classList.toggle("active", !isGroup);
  elements.groupSettings.classList.toggle("hidden", !isGroup);
  elements.rowSettings.classList.toggle("hidden", isGroup);
}

function handleStudentSubmit(event) {
  event.preventDefault();

  const name = elements.studentName.value.trim();
  const seatNumber = Number(elements.studentNumber.value);
  const gender = elements.studentGender.value;

  if (!name) {
    setMessage("請先輸入學生姓名。", "warning");
    return;
  }

  if (!Number.isInteger(seatNumber) || seatNumber <= 0) {
    setMessage("請輸入正整數座號。", "warning");
    return;
  }

  const duplicateNumber = state.students.find((student) => student.seatNumber === seatNumber && student.id !== state.editingId);
  if (duplicateNumber) {
    setMessage(`座號 ${seatNumber} 已存在，請使用其他座號。`, "warning");
    return;
  }

  if (state.editingId) {
    const target = state.students.find((student) => student.id === state.editingId);
    if (target) {
      target.name = name;
      target.seatNumber = seatNumber;
      target.gender = gender;
      state.students.sort((a, b) => a.seatNumber - b.seatNumber);
      clearAssignments(false);
      setMessage(`已更新學生資料：${seatNumber} 號 ${name}`);
    }
  } else {
    state.students.push({
      id: crypto.randomUUID(),
      name,
      seatNumber,
      gender,
    });
    clearAssignments(false);
    state.students.sort((a, b) => a.seatNumber - b.seatNumber);
    setMessage(`已新增學生：${seatNumber} 號 ${name}`);
  }

  resetForm();
  renderStudentList();
}

function renderStudentList() {
  elements.studentCountBadge.textContent = `${state.students.length} 人`;

  if (!state.students.length) {
    elements.studentList.innerHTML = '<p class="hint">目前尚未加入學生。</p>';
    return;
  }

  elements.studentList.innerHTML = state.students
    .map((student) => `
      <article class="student-item">
        <div class="student-meta">
          <strong>${student.seatNumber} 號 ${escapeHtml(student.name)}</strong>
          <span class="gender-tag ${student.gender}">${student.gender === "male" ? "男生" : "女生"}</span>
        </div>
        <div class="item-actions">
          <button class="icon-btn" type="button" data-action="edit" data-id="${student.id}">編輯</button>
          <button class="icon-btn" type="button" data-action="delete" data-id="${student.id}">刪除</button>
        </div>
      </article>
    `)
    .join("");

  elements.studentList.querySelectorAll("[data-action='edit']").forEach((button) => {
    button.addEventListener("click", () => editStudent(button.dataset.id));
  });

  elements.studentList.querySelectorAll("[data-action='delete']").forEach((button) => {
    button.addEventListener("click", () => deleteStudent(button.dataset.id));
  });
}

function renderSavedClasses() {
  const savedClasses = getSavedClasses();
  elements.savedClassCount.textContent = `${savedClasses.length} 筆`;

  if (!savedClasses.length) {
    elements.savedClassList.innerHTML = '<p class="hint">目前尚未存任何班級。</p>';
    return;
  }

  elements.savedClassList.innerHTML = savedClasses
    .map((item) => `
      <article class="saved-class-item">
        <strong>${escapeHtml(item.name)}</strong>
        <div class="saved-class-meta">
          <span>${item.students.length} 人</span>
          <span>${item.updatedAt}</span>
        </div>
        <div class="item-actions">
          <button class="icon-btn" type="button" data-class-action="load" data-class-name="${escapeAttribute(item.name)}">載入</button>
          <button class="icon-btn" type="button" data-class-action="delete" data-class-name="${escapeAttribute(item.name)}">刪除</button>
        </div>
      </article>
    `)
    .join("");

  elements.savedClassList.querySelectorAll("[data-class-action='load']").forEach((button) => {
    button.addEventListener("click", () => loadSavedClass(button.dataset.className));
  });

  elements.savedClassList.querySelectorAll("[data-class-action='delete']").forEach((button) => {
    button.addEventListener("click", () => deleteSavedClass(button.dataset.className));
  });
}

function editStudent(id) {
  const student = state.students.find((item) => item.id === id);
  if (!student) return;

  state.editingId = id;
  elements.studentId.value = id;
  elements.studentName.value = student.name;
  elements.studentNumber.value = student.seatNumber;
  elements.studentGender.value = student.gender;
  elements.cancelEditBtn.classList.remove("hidden");
  elements.studentName.focus();
  setMessage(`正在編輯：${student.seatNumber} 號 ${student.name}`);
}

function deleteStudent(id) {
  const student = state.students.find((item) => item.id === id);
  state.students = state.students.filter((item) => item.id !== id);
  state.students.sort((a, b) => a.seatNumber - b.seatNumber);
  renderStudentList();
  clearAssignments(false);
  resetForm();
  setMessage(student ? `已刪除學生：${student.seatNumber} 號 ${student.name}` : "已刪除學生資料。");
}

function resetForm() {
  state.editingId = null;
  elements.studentId.value = "";
  elements.studentForm.reset();
  elements.studentNumber.value = "";
  elements.studentGender.value = "male";
  elements.cancelEditBtn.classList.add("hidden");
}

function renderGroupSelectors() {
  elements.groupCountSelect.innerHTML = Array.from({ length: TOTAL_GROUPS }, (_, index) => {
    const value = index + 1;
    return `<option value="${value}" ${value === state.groupSettings.groupCount ? "selected" : ""}>${value} 組</option>`;
  }).join("");

  const emptyOptions = ['<option value="">不指定</option>'];
  for (let i = 1; i <= TOTAL_GROUPS; i += 1) {
    const selected = String(i) === state.groupSettings.emptyGroup ? "selected" : "";
    emptyOptions.push(`<option value="${i}" ${selected}>第 ${i} 組</option>`);
  }
  elements.emptyGroupSelect.innerHTML = emptyOptions.join("");
}

function renderGroupConfigCards() {
  const emptyGroup = state.groupSettings.emptyGroup ? Number(state.groupSettings.emptyGroup) : null;
  const groupPlan = buildGroupNumberPlan(state.groupSettings.groupCount, emptyGroup);
  const activeGroupSet = new Set(groupPlan.ok ? groupPlan.activeGroups : Array.from({ length: state.groupSettings.groupCount }, (_, index) => index + 1));

  elements.groupConfigList.innerHTML = Array.from({ length: TOTAL_GROUPS }, (_, index) => {
    const groupNumber = index + 1;
    const inactive = !activeGroupSet.has(groupNumber);
    const isEmpty = String(groupNumber) === state.groupSettings.emptyGroup;
    return `
      <section class="group-card ${inactive ? "inactive" : ""}">
        <h3>第 ${groupNumber} 組 ${inactive ? "（未啟用）" : isEmpty ? "（空桌）" : ""}</h3>
        <p class="hint">${inactive ? "此組目前不使用。" : isEmpty ? "此組指定為不坐人。" : "基準配置為 2 男 2 女，系統會依男女總人數自動調整。"}</p>
      </section>
    `;
  }).join("");
}

function handleGroupCountChange(event) {
  state.groupSettings.groupCount = Number(event.target.value);

  renderGroupSelectors();
  renderGroupConfigCards();
  clearAssignments();
  if (state.groupSettings.emptyGroup && state.groupSettings.groupCount >= TOTAL_GROUPS) {
    setMessage("已設定為使用 6 組；若要指定空桌，使用組數最多請選 5 組。", "warning");
    return;
  }
  setMessage(`已設定為使用 ${state.groupSettings.groupCount} 組。`);
}

function handleEmptyGroupChange(event) {
  state.groupSettings.emptyGroup = event.target.value;
  clearAssignments();
  setMessage(state.groupSettings.emptyGroup ? `已指定第 ${state.groupSettings.emptyGroup} 組為空桌。` : "已取消空桌設定。");
}

function generateSeats(reshuffle) {
  if (!state.students.length) {
    setMessage("請先新增學生名單。", "warning");
    return;
  }

  const result = state.mode === "group" ? buildGroupAssignments(reshuffle) : buildRowAssignments(reshuffle);

  if (!result.ok) {
    clearAssignments(false);
    setMessage(result.message, "error");
    return;
  }

  state.seatAssignments = result;
  renderSeatMap();
  setMessage(result.message);
}

function buildGroupAssignments(reshuffle) {
  const emptyGroup = state.groupSettings.emptyGroup ? Number(state.groupSettings.emptyGroup) : null;
  const groupPlan = buildGroupNumberPlan(state.groupSettings.groupCount, emptyGroup);

  if (!groupPlan.ok) {
    return { ok: false, message: groupPlan.message };
  }

  const activeGroups = groupPlan.activeGroups;

  if (emptyGroup && !activeGroups.includes(emptyGroup)) {
    return { ok: false, message: "空桌設定超出目前使用組數。" };
  }

  let totalSeats = 0;

  for (const groupNumber of activeGroups) {
    if (groupNumber === emptyGroup) continue;
    totalSeats += SEATS_PER_GROUP;
  }

  const males = state.students.filter((student) => student.gender === "male");
  const females = state.students.filter((student) => student.gender === "female");

  if (state.students.length > totalSeats) {
    return { ok: false, message: `目前可用座位只有 ${totalSeats} 位，學生共有 ${state.students.length} 人，座位不足。` };
  }

  const effectiveConfigs = buildDynamicGroupConfigs(activeGroups, emptyGroup, males.length, females.length);
  if (!effectiveConfigs.ok) {
    return { ok: false, message: effectiveConfigs.message };
  }

  const malePool = shuffleArray([...males]);
  const femalePool = shuffleArray([...females]);
  const assignments = [];

  for (const groupNumber of activeGroups) {
    if (groupNumber === emptyGroup) {
      assignments.push({
        groupNumber,
        emptyTable: true,
        seats: Array.from({ length: SEATS_PER_GROUP }, () => ({ type: "empty-table", label: "本桌不坐人" })),
      });
      continue;
    }

    const config = effectiveConfigs.configs[groupNumber];
    const maleStudents = [];
    const femaleStudents = [];

    for (let i = 0; i < config.male; i += 1) {
      maleStudents.push(malePool.shift());
    }

    for (let i = 0; i < config.female; i += 1) {
      femaleStudents.push(femalePool.shift());
    }

    const sides = buildGroupSides(maleStudents, femaleStudents, reshuffle);

    assignments.push({
      groupNumber,
      emptyTable: false,
      sides,
      config: { ...config },
    });
  }

  if (malePool.length || femalePool.length) {
    return {
      ok: false,
      message: `仍有學生未分配：男生 ${malePool.length} 人、女生 ${femalePool.length} 人。請增加組數或調整各組配置。`,
    };
  }

  return {
    ok: true,
    mode: "group",
    assignments,
    message: `分組模式排座完成，共安排 ${state.students.length} 位學生。`,
    summary: buildGroupSummary(assignments, effectiveConfigs.configs),
  };
}

function buildGroupNumberPlan(groupCount, emptyGroup) {
  if (!emptyGroup) {
    return {
      ok: true,
      activeGroups: Array.from({ length: groupCount }, (_, index) => index + 1),
    };
  }

  if (groupCount >= TOTAL_GROUPS) {
    return {
      ok: false,
      message: "指定空桌時，使用組數最多只能選 5 組，因為全班只有 6 組桌位。",
    };
  }

  const activeGroups = [];
  for (let groupNumber = 1; groupNumber <= TOTAL_GROUPS; groupNumber += 1) {
    if (groupNumber === emptyGroup || activeGroups.length < groupCount) {
      activeGroups.push(groupNumber);
    }
    if (activeGroups.length === groupCount + 1) {
      break;
    }
  }

  if (!activeGroups.includes(emptyGroup) || activeGroups.length !== groupCount + 1) {
    return {
      ok: false,
      message: "空桌與使用組數的設定超出目前 6 組桌位範圍。",
    };
  }

  return { ok: true, activeGroups };
}

function buildRowAssignments(reshuffle) {
  const totalSeats = TOTAL_ROWS * SEATS_PER_ROW;

  if (state.students.length > totalSeats) {
    return { ok: false, message: `排列模式共有 ${totalSeats} 個座位，目前學生 ${state.students.length} 人，座位不足。` };
  }

  const pool = shuffleArray([...state.students]);
  const rows = [];

  for (let rowNumber = 1; rowNumber <= TOTAL_ROWS; rowNumber += 1) {
    const seats = [];
    for (let seatNumber = 1; seatNumber <= SEATS_PER_ROW; seatNumber += 1) {
      const student = pool.shift();
      seats.push(student ? { type: "student", student } : { type: "unused", label: "空位" });
    }
    rows.push({
      rowNumber,
      seats: reshuffle ? shuffleArray(seats) : seats,
    });
  }

  return {
    ok: true,
    mode: "row",
    rows,
    message: `排列模式排座完成，共安排 ${state.students.length} 位學生。`,
    summary: `6 排 x 5 座位，已安排 ${state.students.length} 人。`,
  };
}

function buildDynamicGroupConfigs(activeGroups, emptyGroup, maleCount, femaleCount) {
  const usableGroups = activeGroups.filter((groupNumber) => groupNumber !== emptyGroup);
  const configs = {};

  usableGroups.forEach((groupNumber) => {
    configs[groupNumber] = { male: 2, female: 2 };
  });

  adjustGenderSeats(configs, usableGroups, "male", maleCount);
  adjustGenderSeats(configs, usableGroups, "female", femaleCount);

  for (const groupNumber of usableGroups) {
    const config = configs[groupNumber];
    const groupTotal = config.male + config.female;
    if (groupTotal > SEATS_PER_GROUP) {
      return { ok: false, message: `第 ${groupNumber} 組超過 6 個座位，請增加組數或調整空桌設定。` };
    }
  }

  const totalAssigned = usableGroups.reduce((sum, groupNumber) => {
    const config = configs[groupNumber];
    return sum + config.male + config.female;
  }, 0);

  if (totalAssigned !== maleCount + femaleCount) {
    return { ok: false, message: "分組座位調整後仍無法完整容納學生，請增加組數或取消空桌。" };
  }

  return { ok: true, configs };
}

function adjustGenderSeats(configs, usableGroups, genderKey, actualCount) {
  const defaultTotal = usableGroups.length * 2;
  let diff = actualCount - defaultTotal;
  const orderedGroups = [...usableGroups].sort((a, b) => b - a);

  if (diff < 0) {
    let remaining = Math.abs(diff);
    while (remaining > 0) {
      let changed = false;
      for (const groupNumber of orderedGroups) {
        if (configs[groupNumber][genderKey] > 0) {
          configs[groupNumber][genderKey] -= 1;
          remaining -= 1;
          changed = true;
        }
        if (remaining === 0) break;
      }
      if (!changed) break;
    }
    return;
  }

  if (diff > 0) {
    let remaining = diff;
    while (remaining > 0) {
      let changed = false;
      for (const groupNumber of orderedGroups) {
        const config = configs[groupNumber];
        if (config.male + config.female < SEATS_PER_GROUP) {
          config[genderKey] += 1;
          remaining -= 1;
          changed = true;
        }
        if (remaining === 0) break;
      }
      if (!changed) break;
    }
  }
}

function buildGroupSummary(assignments, configs) {
  const activeTables = assignments.filter((item) => !item.emptyTable).length;
  const emptyTables = assignments.filter((item) => item.emptyTable).length;
  const detail = assignments
    .filter((item) => !item.emptyTable)
    .map((item) => {
      const config = configs[item.groupNumber];
      return `${item.groupNumber}組 ${config.male}男${config.female}女`;
    })
    .join("、");
  return `已使用 ${activeTables} 組${emptyTables ? `，空下 ${emptyTables} 組` : ""}。${detail ? ` ${detail}` : ""}`;
}

function renderSeatMap() {
  if (!state.seatAssignments) {
    elements.seatSummary.textContent = "尚未安排";
    elements.seatMap.innerHTML = '<p class="hint">座位圖會顯示在這裡。</p>';
    elements.seatMap.classList.toggle("teacher-view", state.teacherView);
    updateTeacherViewButton();
    return;
  }

  elements.seatSummary.textContent = state.seatAssignments.summary || "";
  elements.seatMap.classList.toggle("teacher-view", state.teacherView);
  updateTeacherViewButton();

  if (state.seatAssignments.mode === "group") {
    const groupMap = new Map(state.seatAssignments.assignments.map((group) => [group.groupNumber, group]));
    elements.seatMap.innerHTML = `
      <div class="classroom-layout">
        <div class="teacher-desk"><span>講桌</span></div>
        <div class="classroom-row">
          ${[1, 2, 3].map((groupNumber) => renderGroupAssignment(groupMap.get(groupNumber), groupNumber)).join("")}
        </div>
        <div class="classroom-row">
          ${[4, 5, 6].map((groupNumber) => renderGroupAssignment(groupMap.get(groupNumber), groupNumber)).join("")}
        </div>
      </div>
    `;
    bindSeatDragEvents();
    return;
  }

  elements.seatMap.innerHTML = `
    <div class="row-seat-layout">
      ${state.seatAssignments.rows.map(renderRowAssignment).join("")}
    </div>
  `;

  bindSeatDragEvents();
}

function renderGroupAssignment(group, fallbackGroupNumber = null) {
  if (!group) {
    return `
      <section class="group-seat-card inactive-table">
        <h3>第 ${fallbackGroupNumber} 組</h3>
        <div class="empty-table-body">未啟用</div>
      </section>
    `;
  }

  if (group.emptyTable) {
    return `
      <section class="group-seat-card empty-table">
        <h3>第 ${group.groupNumber} 組</h3>
        <div class="empty-table-body">本桌不坐人</div>
      </section>
    `;
  }

  return `
    <section class="group-seat-card">
      <h3>第 ${group.groupNumber} 組</h3>
      <div class="group-table-layout">
        <div class="seat-column">
          ${group.sides.left.map((seat, index) => renderSeat(seat, `group-${group.groupNumber}-left-${index}`)).join("")}
        </div>
        <div class="table-center">
          <div class="table-surface">實驗桌</div>
        </div>
        <div class="seat-column">
          ${group.sides.right.map((seat, index) => renderSeat(seat, `group-${group.groupNumber}-right-${index}`)).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderRowAssignment(row) {
  return `
    <section class="row-block">
      <h3>第 ${row.rowNumber} 排</h3>
      <div class="row-grid">
        ${row.seats.map((seat, index) => renderSeat(seat, `row-${row.rowNumber}-${index}`)).join("")}
      </div>
    </section>
  `;
}

function renderSeat(seat, seatId = "") {
  const draggable = seat.type !== "empty-table";
  if (seat.type === "student") {
    return `<div class="seat ${seat.student.gender}" draggable="${draggable}" data-seat-id="${seatId}">${seat.student.seatNumber} 號<br>${escapeHtml(seat.student.name)}</div>`;
  }

  if (seat.type === "empty-table") {
    return '<div class="seat empty">本桌不坐人</div>';
  }

  return `<div class="seat unused" draggable="${draggable}" data-seat-id="${seatId}">${seat.label}</div>`;
}

function buildGroupSides(maleStudents, femaleStudents, reshuffle) {
  const maleSeats = reshuffle ? shuffleArray(maleStudents) : maleStudents;
  const femaleSeats = reshuffle ? shuffleArray(femaleStudents) : femaleStudents;
  const left = [];
  const right = [];

  const primaryLeftGender = maleSeats.length >= femaleSeats.length ? "male" : "female";
  const primary = primaryLeftGender === "male" ? maleSeats : femaleSeats;
  const secondary = primaryLeftGender === "male" ? femaleSeats : maleSeats;

  fillSide(left, primary, 3);

  if (primary.length > 0) {
    fillSide(right, primary, Math.min(3, 3 - right.length));
  }

  fillSide(right, secondary, 3);

  if (secondary.length > 0) {
    fillSide(left, secondary, Math.min(3 - left.length, secondary.length));
  }

  while (left.length < 3) {
    left.push({ type: "unused", label: "空位" });
  }

  while (right.length < 3) {
    right.push({ type: "unused", label: "空位" });
  }

  return { left, right };
}

function fillSide(target, source, maxLength) {
  while (target.length < maxLength && source.length > 0) {
    target.push({ type: "student", student: source.shift() });
  }
}

function bindSeatDragEvents() {
  elements.seatMap.querySelectorAll("[data-seat-id]").forEach((seatElement) => {
    seatElement.addEventListener("dragstart", handleSeatDragStart);
    seatElement.addEventListener("dragover", handleSeatDragOver);
    seatElement.addEventListener("dragleave", handleSeatDragLeave);
    seatElement.addEventListener("drop", handleSeatDrop);
    seatElement.addEventListener("dragend", handleSeatDragEnd);
  });
}

function handleSeatDragStart(event) {
  const seatId = event.currentTarget.dataset.seatId;
  dragState.sourceSeatId = seatId;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", seatId);
  event.currentTarget.classList.add("dragging");
}

function handleSeatDragOver(event) {
  event.preventDefault();
  const target = event.currentTarget;
  if (dragState.sourceSeatId && target.dataset.seatId !== dragState.sourceSeatId) {
    target.classList.add("drag-over");
  }
}

function handleSeatDragLeave(event) {
  event.currentTarget.classList.remove("drag-over");
}

function handleSeatDrop(event) {
  event.preventDefault();
  const targetSeatId = event.currentTarget.dataset.seatId;
  const sourceSeatId = dragState.sourceSeatId || event.dataTransfer.getData("text/plain");
  event.currentTarget.classList.remove("drag-over");

  if (!sourceSeatId || !targetSeatId || sourceSeatId === targetSeatId) {
    return;
  }

  const swapped = swapSeatAssignments(sourceSeatId, targetSeatId);
  if (!swapped) {
    setMessage("這兩個座位無法交換。", "warning");
    return;
  }

  renderSeatMap();
  setMessage("已調換座位。");
}

function handleSeatDragEnd(event) {
  dragState.sourceSeatId = null;
  event.currentTarget.classList.remove("dragging");
  elements.seatMap.querySelectorAll(".drag-over").forEach((element) => {
    element.classList.remove("drag-over");
  });
}

function swapSeatAssignments(sourceSeatId, targetSeatId) {
  const sourceRef = findSeatReference(sourceSeatId);
  const targetRef = findSeatReference(targetSeatId);

  if (!sourceRef || !targetRef) {
    return false;
  }

  const sourceValue = cloneSeatValue(sourceRef.collection[sourceRef.index]);
  sourceRef.collection[sourceRef.index] = cloneSeatValue(targetRef.collection[targetRef.index]);
  targetRef.collection[targetRef.index] = sourceValue;
  return true;
}

function findSeatReference(seatId) {
  if (!state.seatAssignments) return null;

  if (state.seatAssignments.mode === "group") {
    const match = seatId.match(/^group-(\d+)-(left|right)-(\d+)$/);
    if (!match) return null;
    const [, groupNumberRaw, side, indexRaw] = match;
    const groupNumber = Number(groupNumberRaw);
    const index = Number(indexRaw);
    const group = state.seatAssignments.assignments.find((item) => item.groupNumber === groupNumber && !item.emptyTable);
    if (!group) return null;
    return {
      collection: group.sides[side],
      index,
    };
  }

  const match = seatId.match(/^row-(\d+)-(\d+)$/);
  if (!match) return null;
  const [, rowNumberRaw, indexRaw] = match;
  const rowNumber = Number(rowNumberRaw);
  const index = Number(indexRaw);
  const row = state.seatAssignments.rows.find((item) => item.rowNumber === rowNumber);
  if (!row) return null;
  return {
    collection: row.seats,
    index,
  };
}

function cloneSeatValue(seat) {
  if (seat.type === "student") {
    return {
      type: "student",
      student: { ...seat.student },
    };
  }

  return { ...seat };
}

function clearAssignments(resetMessage = true) {
  state.seatAssignments = null;
  renderSeatMap();
  if (resetMessage) {
    setMessage("設定已變更，請重新按「自動排座」。");
  }
}

function saveCurrentClass() {
  const className = elements.classNameInput.value.trim();
  if (!className) {
    setMessage("請先輸入班級名稱再存檔。", "warning");
    return;
  }

  const savedClasses = getSavedClasses();
  const payload = {
    name: className,
    updatedAt: formatNow(),
    students: state.students,
    mode: state.mode,
    seatAssignments: state.seatAssignments,
    teacherView: state.teacherView,
    groupSettings: {
      groupCount: state.groupSettings.groupCount,
      emptyGroup: state.groupSettings.emptyGroup,
    },
  };

  const existingIndex = savedClasses.findIndex((item) => item.name === className);
  if (existingIndex >= 0) {
    savedClasses[existingIndex] = payload;
  } else {
    savedClasses.push(payload);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedClasses));
  state.currentClassName = className;
  renderSavedClasses();
  setMessage(`已儲存班級：${className}`);
}

function createNewClass() {
  state.students = [];
  state.mode = "group";
  state.editingId = null;
  state.seatAssignments = null;
  state.currentClassName = "";
  state.teacherView = false;
  state.groupSettings.groupCount = 6;
  state.groupSettings.emptyGroup = "";
  elements.classNameInput.value = "";
  resetForm();
  renderGroupSelectors();
  renderGroupConfigCards();
  renderStudentList();
  renderMode();
  renderSeatMap();
  setMessage("已清空目前資料，可開始新班級。");
}

function loadSavedClass(className) {
  const savedClass = getSavedClasses().find((item) => item.name === className);
  if (!savedClass) {
    setMessage("找不到這個班級存檔。", "error");
    return;
  }

  state.students = Array.isArray(savedClass.students) ? savedClass.students : [];
  state.mode = savedClass.mode === "row" ? "row" : "group";
  state.seatAssignments = savedClass.seatAssignments || null;
  state.currentClassName = savedClass.name;
  state.teacherView = Boolean(savedClass.teacherView);
  state.groupSettings.groupCount = Number(savedClass.groupSettings?.groupCount) || 6;
  state.groupSettings.emptyGroup = savedClass.groupSettings?.emptyGroup || "";
  elements.classNameInput.value = savedClass.name;

  resetForm();
  renderStudentList();
  renderGroupSelectors();
  renderGroupConfigCards();
  renderMode();
  renderSeatMap();
  setMessage(`已載入班級：${className}`);
}

function deleteSavedClass(className) {
  const savedClasses = getSavedClasses().filter((item) => item.name !== className);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedClasses));
  renderSavedClasses();
  setMessage(`已刪除班級存檔：${className}`);
}

function getSavedClasses() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function toggleTeacherView() {
  state.teacherView = !state.teacherView;
  renderSeatMap();
  setMessage(state.teacherView ? "已切換為教師視角。" : "已切換為學生視角。");
}

function updateTeacherViewButton() {
  elements.teacherViewBtn.textContent = state.teacherView ? "學生視角" : "教師視角";
}

function printSeatMap() {
  if (!state.seatAssignments) {
    setMessage("請先完成排座後再列印。", "warning");
    return;
  }
  window.print();
}

function formatNow() {
  const formatter = new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return formatter.format(new Date());
}

function setMessage(message, level = "info") {
  elements.messageBox.textContent = message;
  elements.messageBox.className = `message-box ${level === "info" ? "" : level}`.trim();
}

async function handleCsvImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await decodeCsvFile(file);
    importStudentsFromText(text, `CSV 匯入完成：${file.name}`);
  } catch (error) {
    setMessage(error.message || "CSV 匯入失敗，請確認檔案格式。", "error");
  } finally {
    elements.csvFileInput.value = "";
  }
}

function handleTextImport() {
  const text = elements.csvTextInput.value.trim();
  if (!text) {
    setMessage("請先貼上 CSV 內容。", "warning");
    return;
  }

  importStudentsFromText(text, "貼上匯入完成");
}

function importStudentsFromText(text, prefixMessage) {
  try {
    const imported = parseCsv(text);
    if (!imported.length) {
      setMessage("沒有讀到可匯入的學生資料，請確認欄位是座號、姓名、性別。", "warning");
      return;
    }

    const existingNumbers = new Set(state.students.map((student) => student.seatNumber));
    const importedNumbers = new Set();
    for (const student of imported) {
      if (existingNumbers.has(student.seatNumber) || importedNumbers.has(student.seatNumber)) {
        setMessage(`座號 ${student.seatNumber} 重複，請先修正 CSV。`, "error");
        return;
      }
      importedNumbers.add(student.seatNumber);
    }

    state.students.push(...imported);
    state.students.sort((a, b) => a.seatNumber - b.seatNumber);
    renderStudentList();
    clearAssignments(false);
    setMessage(`${prefixMessage}，共新增 ${imported.length} 位學生。`);
  } catch (error) {
    setMessage(error.message || "匯入失敗，請確認內容格式。", "error");
  }
}

async function decodeCsvFile(file) {
  const buffer = await file.arrayBuffer();
  const utf8Text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  if (!looksCorrupted(utf8Text)) {
    return utf8Text;
  }

  try {
    return new TextDecoder("big5", { fatal: false }).decode(buffer);
  } catch {
    return utf8Text;
  }
}

function looksCorrupted(text) {
  const brokenCount = (text.match(/\uFFFD/g) || []).length;
  return brokenCount > 0;
}

function parseCsv(content) {
  const normalized = content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const rows = lines.map(splitSmartLine);
  const firstRow = rows[0].map((cell) => cell.trim().toLowerCase());
  const hasHeader = firstRow.some((cell) => ["座號", "number", "seatnumber", "seat_number"].includes(cell))
    || firstRow.some((cell) => ["姓名", "name", "學生姓名"].includes(cell))
    || firstRow.some((cell) => ["性別", "gender"].includes(cell));
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const imported = [];

  for (const row of dataRows) {
    const seatNumber = Number((row[0] || "").trim());
    const name = (row[1] || "").trim();
    const genderRaw = (row[2] || "").trim();
    const gender = normalizeGender(genderRaw);

    if (!Number.isInteger(seatNumber) || seatNumber <= 0 || !name || !gender) continue;

    imported.push({
      id: crypto.randomUUID(),
      name,
      seatNumber,
      gender,
    });
  }

  return imported;
}

function splitSmartLine(line) {
  const delimiter = line.includes("\t") ? "\t" : ",";
  if (delimiter === "\t") {
    return line.split("\t");
  }
  return splitCsvLine(line);
}

function splitCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}

function normalizeGender(value) {
  const normalized = value.trim().toLowerCase();
  if (["男", "male", "m", "boy", "1"].includes(normalized)) return "male";
  if (["女", "female", "f", "girl", "0"].includes(normalized)) return "female";
  return "";
}

function shuffleArray(list) {
  const copied = [...list];
  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
