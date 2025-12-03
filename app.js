// ===== Constants =====
const COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
    '#E63946', '#F77F00', '#06FFC5', '#118AB2', '#073B4C',
    '#FFB4A2', '#E5989B', '#B5838D', '#6D6875', '#FFCDB2',
    '#FFB4A2', '#E5989B', '#B5838D', '#6D6875', '#B8F2E6',
    '#FFA69E', '#FAF3DD', '#C8D5B9', '#8FC0A9', '#68B0AB',
    '#4A90A4', '#3D5A80', '#EE6C4D', '#F38D68', '#662E9B',
    '#EA698B', '#AC3931', '#571F4E', '#F4A261', '#2A9D8F'
];

const MIN_BLOCK_HEIGHT = 10; // 最小顯示單位：10分鐘
const TIME_SNAP = 5; // 對齊刻度：5分鐘
const SLOT_HEIGHT = 60; // 每個時間槽高度（10分鐘）
const DEFAULT_PLAN_DURATION = 120; // 預設計畫時長：2小時
const MAX_UNDO_STEPS = 3; // 最多記錄3步

// ===== Global State =====
let state = {
    plans: [],
    currentPlanId: null,
    undoStack: [],
    redoStack: []
};

// ===== Utility Functions =====
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getRandomColor() {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
}

function timeToMinutes(timeStr) {
    const [time, period] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let totalHours = hours;
    if (period === 'PM' && hours !== 12) totalHours += 12;
    if (period === 'AM' && hours === 12) totalHours = 0;
    return totalHours * 60 + minutes;
}

function snapToGrid(minutes) {
    return Math.round(minutes / TIME_SNAP) * TIME_SNAP;
}

// ===== Data Management =====
function saveState() {
    localStorage.setItem('timeblock-scheduler', JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem('timeblock-scheduler');
    if (saved) {
        state = JSON.parse(saved);
        // 檢查並自動封存超過3天的計畫
        const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
        state.plans.forEach(plan => {
            if (!plan.archived && plan.lastUsed < threeDaysAgo) {
                plan.archived = true;
            }
        });
    } else {
        // 初始化第一個計畫
        createNewPlan();
    }
}

function getCurrentPlan() {
    return state.plans.find(p => p.id === state.currentPlanId);
}

function addToUndoStack() {
    const planCopy = JSON.parse(JSON.stringify(getCurrentPlan()));
    state.undoStack.push(planCopy);
    if (state.undoStack.length > MAX_UNDO_STEPS) {
        state.undoStack.shift();
    }
    state.redoStack = [];
}

// ===== Plan Management =====
function createNewPlan() {
    const now = new Date();
    const startMinutes = now.getHours() * 60 + now.getMinutes();
    const endMinutes = startMinutes + DEFAULT_PLAN_DURATION;
    
    const plan = {
        id: generateId(),
        name: `計畫 ${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        archived: false,
        timelineStart: snapToGrid(startMinutes),
        timelineEnd: snapToGrid(endMinutes),
        tasks: [],
        blocks: []
    };
    
    state.plans.push(plan);
    state.currentPlanId = plan.id;
    saveState();
    renderAll();
}

function switchPlan(planId) {
    const plan = state.plans.find(p => p.id === planId);
    if (plan) {
        plan.lastUsed = Date.now();
        state.currentPlanId = planId;
        saveState();
        renderAll();
    }
}

function archivePlan(planId) {
    const plan = state.plans.find(p => p.id === planId);
    if (plan) {
        plan.archived = true;
        if (state.currentPlanId === planId) {
            const activePlans = state.plans.filter(p => !p.archived);
            if (activePlans.length > 0) {
                state.currentPlanId = activePlans[0].id;
            } else {
                createNewPlan();
            }
        }
        saveState();
        renderAll();
    }
}

function deletePlan(planId) {
    state.plans = state.plans.filter(p => p.id !== planId);
    if (state.currentPlanId === planId) {
        if (state.plans.length > 0) {
            state.currentPlanId = state.plans[0].id;
        } else {
            createNewPlan();
        }
    }
    saveState();
    renderAll();
}

function restorePlan(planId) {
    const plan = state.plans.find(p => p.id === planId);
    if (plan) {
        plan.archived = false;
        plan.lastUsed = Date.now();
        saveState();
        renderAll();
    }
}

function renamePlan(planId, newName) {
    const plan = state.plans.find(p => p.id === planId);
    if (plan) {
        plan.name = newName;
        saveState();
        renderAll();
    }
}

function extendTimeline(minutes) {
    const plan = getCurrentPlan();
    if (plan) {
        addToUndoStack();
        plan.timelineEnd += minutes;
        saveState();
        renderTimeline();
    }
}

function resetTimeline() {
    const plan = getCurrentPlan();
    if (plan) {
        addToUndoStack();
        const now = new Date();
        const startMinutes = now.getHours() * 60 + now.getMinutes();
        plan.timelineStart = snapToGrid(startMinutes);
        plan.timelineEnd = snapToGrid(startMinutes + DEFAULT_PLAN_DURATION);
        plan.blocks = [];
        saveState();
        renderAll();
    }
}

// ===== Task Management =====
function createTask(name, duration, note) {
    const plan = getCurrentPlan();
    if (plan) {
        addToUndoStack();
        const task = {
            taskId: generateId(),
            name,
            duration,
            color: getRandomColor(),
            note: note || '',
            createdAt: Date.now(),
            remainingDuration: duration
        };
        plan.tasks.push(task);
        saveState();
        renderWaitingArea();
    }
}

function getTaskById(taskId) {
    const plan = getCurrentPlan();
    return plan ? plan.tasks.find(t => t.taskId === taskId) : null;
}

function calculateRemainingDuration(taskId) {
    const plan = getCurrentPlan();
    if (!plan) return 0;
    
    const task = getTaskById(taskId);
    if (!task) return 0;
    
    const blocksForTask = plan.blocks.filter(b => b.taskId === taskId);
    const usedMinutes = blocksForTask.reduce((sum, block) => {
        const start = timeToMinutes(block.start);
        const end = timeToMinutes(block.end);
        return sum + (end - start);
    }, 0);
    
    return task.duration - usedMinutes;
}

// ===== Block Management =====
function createBlock(taskId, startTime, endTime) {
    const plan = getCurrentPlan();
    if (plan) {
        const block = {
            blockId: generateId(),
            taskId,
            start: startTime,
            end: endTime,
            completed: false
        };
        plan.blocks.push(block);
        return block;
    }
    return null;
}

function removeBlock(blockId) {
    const plan = getCurrentPlan();
    if (plan) {
        plan.blocks = plan.blocks.filter(b => b.blockId !== blockId);
    }
}

function canPlaceBlock(startMinutes, endMinutes, excludeBlockId = null) {
    const plan = getCurrentPlan();
    if (!plan) return false;
    
    // 檢查是否在時間軸範圍內
    if (startMinutes < plan.timelineStart || endMinutes > plan.timelineEnd) {
        return false;
    }
    
    // 檢查是否與其他區塊重疊
    for (const block of plan.blocks) {
        if (block.blockId === excludeBlockId) continue;
        
        const blockStart = timeToMinutes(block.start);
        const blockEnd = timeToMinutes(block.end);
        
        if (!(endMinutes <= blockStart || startMinutes >= blockEnd)) {
            return false;
        }
    }
    
    return true;
}

function findAvailableSpace(startMinutes, durationMinutes) {
    const plan = getCurrentPlan();
    if (!plan) return null;
    
    const endMinutes = startMinutes + durationMinutes;
    
    // 檢查是否完全可用
    if (canPlaceBlock(startMinutes, endMinutes)) {
        return { start: startMinutes, end: endMinutes, duration: durationMinutes };
    }
    
    // 找到第一個衝突的區塊
    for (const block of plan.blocks) {
        const blockStart = timeToMinutes(block.start);
        const blockEnd = timeToMinutes(block.end);
        
        if (startMinutes < blockEnd && endMinutes > blockStart) {
            // 有衝突，計算可用空間
            const availableDuration = blockStart - startMinutes;
            if (availableDuration >= MIN_BLOCK_HEIGHT) {
                return { 
                    start: startMinutes, 
                    end: blockStart, 
                    duration: availableDuration,
                    hasRemaining: true,
                    remainingDuration: durationMinutes - availableDuration
                };
            }
            return null;
        }
    }
    
    return null;
}

function toggleBlockCompletion(blockId) {
    const plan = getCurrentPlan();
    if (plan) {
        const block = plan.blocks.find(b => b.blockId === blockId);
        if (block) {
            addToUndoStack();
            block.completed = !block.completed;
            saveState();
            renderTimeline();
        }
    }
}

// ===== Drag and Drop =====
let draggedElement = null;
let draggedData = null;

function handleDragStart(e, data) {
    draggedElement = e.target;
    draggedData = data;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedElement = null;
    draggedData = null;
    
    // 移除所有 drop-target 樣式
    document.querySelectorAll('.drop-target').forEach(el => {
        el.classList.remove('drop-target');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e, dropMinutes) {
    e.preventDefault();
    
    if (!draggedData) return;
    
    const plan = getCurrentPlan();
    if (!plan) return;
    
    addToUndoStack();
    
    if (draggedData.type === 'task') {
        // 從等待區拖入時間軸
        const task = getTaskById(draggedData.taskId);
        if (!task) return;
        
        const remaining = calculateRemainingDuration(draggedData.taskId);
        if (remaining <= 0) return;
        
        const snappedStart = snapToGrid(dropMinutes);
        const space = findAvailableSpace(snappedStart, remaining);
        
        if (space && space.duration >= MIN_BLOCK_HEIGHT) {
            createBlock(
                draggedData.taskId,
                minutesToTime(space.start),
                minutesToTime(space.end)
            );
            
            // 如果有剩餘且剩餘 < 10分鐘，則捨棄
            if (space.hasRemaining && space.remainingDuration < MIN_BLOCK_HEIGHT) {
                // 捨棄剩餘部分
            }
            
            saveState();
            renderAll();
        }
    } else if (draggedData.type === 'block') {
        // 在時間軸內移動區塊
        const block = plan.blocks.find(b => b.blockId === draggedData.blockId);
        if (!block) return;
        
        const task = getTaskById(block.taskId);
        if (!task) return;
        
        const blockStart = timeToMinutes(block.start);
        const blockEnd = timeToMinutes(block.end);
        const duration = blockEnd - blockStart;
        
        const snappedStart = snapToGrid(dropMinutes);
        const snappedEnd = snappedStart + duration;
        
        if (canPlaceBlock(snappedStart, snappedEnd, block.blockId)) {
            block.start = minutesToTime(snappedStart);
            block.end = minutesToTime(snappedEnd);
            saveState();
            renderTimeline();
        }
    }
}

function handleDropToWaiting(e) {
    e.preventDefault();
    
    if (!draggedData || draggedData.type !== 'block') return;
    
    const plan = getCurrentPlan();
    if (!plan) return;
    
    addToUndoStack();
    
    // 從時間軸移除區塊
    removeBlock(draggedData.blockId);
    
    saveState();
    renderAll();
}

// ===== Rendering =====
function renderAll() {
    renderPlanTabs();
    renderHeader();
    renderWaitingArea();
    renderTimeline();
}

function renderHeader() {
    const plan = getCurrentPlan();
    if (plan) {
        document.getElementById('planName').textContent = plan.name;
    }
}

function renderPlanTabs() {
    const tabsContainer = document.getElementById('planTabs');
    tabsContainer.innerHTML = '';
    
    const activePlans = state.plans.filter(p => !p.archived);
    
    activePlans.forEach(plan => {
        const tab = document.createElement('button');
        tab.className = 'plan-tab';
        if (plan.id === state.currentPlanId) {
            tab.classList.add('active');
        }
        tab.textContent = plan.name;
        tab.onclick = () => switchPlan(plan.id);
        tab.oncontextmenu = (e) => showContextMenu(e, plan.id);
        tabsContainer.appendChild(tab);
    });
}

function renderWaitingArea() {
    const taskList = document.getElementById('taskList');
    taskList.innerHTML = '';
    
    const plan = getCurrentPlan();
    if (!plan) return;
    
    plan.tasks.forEach(task => {
        const remaining = calculateRemainingDuration(task.taskId);
        
        if (remaining > 0) {
            const taskItem = document.createElement('div');
            taskItem.className = 'task-item';
            taskItem.draggable = true;
            taskItem.style.borderColor = task.color;
            
            const hours = Math.floor(remaining / 60);
            const minutes = remaining % 60;
            let durationText = '';
            if (hours > 0) durationText += `${hours}小時`;
            if (minutes > 0) durationText += `${minutes}分鐘`;
            
            taskItem.innerHTML = `
                <div class="task-name">${task.name}</div>
                <div class="task-duration">${durationText}</div>
                ${task.note ? `<div class="task-note">${task.note}</div>` : ''}
            `;
            
            taskItem.addEventListener('dragstart', (e) => {
                handleDragStart(e, { type: 'task', taskId: task.taskId });
            });
            taskItem.addEventListener('dragend', handleDragEnd);
            
            taskList.appendChild(taskItem);
        }
    });
}

function renderTimeline() {
    const timeline = document.getElementById('timeline');
    timeline.innerHTML = '';
    
    const plan = getCurrentPlan();
    if (!plan) return;
    
    const totalMinutes = plan.timelineEnd - plan.timelineStart;
    const numSlots = totalMinutes / 10; // 每個槽10分鐘
    
    // 創建時間槽
    for (let i = 0; i < numSlots; i++) {
        const slotMinutes = plan.timelineStart + (i * 10);
        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot';
        timeSlot.dataset.minutes = slotMinutes;
        
        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-label';
        timeLabel.textContent = minutesToTime(slotMinutes);
        
        const timeContent = document.createElement('div');
        timeContent.className = 'time-content';
        
        timeContent.addEventListener('dragover', handleDragOver);
        timeContent.addEventListener('drop', (e) => handleDrop(e, slotMinutes));
        timeContent.addEventListener('dragenter', () => {
            timeSlot.classList.add('drop-target');
        });
        timeContent.addEventListener('dragleave', (e) => {
            if (e.target === timeContent) {
                timeSlot.classList.remove('drop-target');
            }
        });
        
        timeSlot.appendChild(timeLabel);
        timeSlot.appendChild(timeContent);
        timeline.appendChild(timeSlot);
    }
    
    // 渲染區塊
    plan.blocks.forEach(block => {
        const task = getTaskById(block.taskId);
        if (!task) return;
        
        const startMinutes = timeToMinutes(block.start);
        const endMinutes = timeToMinutes(block.end);
        const duration = endMinutes - startMinutes;
        
        const topOffset = ((startMinutes - plan.timelineStart) / 10) * SLOT_HEIGHT;
        const height = (duration / 10) * SLOT_HEIGHT;
        
        const blockEl = document.createElement('div');
        blockEl.className = 'task-block';
        if (block.completed) blockEl.classList.add('completed');
        blockEl.style.backgroundColor = task.color;
        blockEl.style.top = `${topOffset}px`;
        blockEl.style.height = `${height}px`;
        blockEl.draggable = true;
        
        blockEl.innerHTML = `
            <div class="task-block-header">
                <div class="task-block-name">${task.name}</div>
                <input type="checkbox" class="task-block-checkbox" ${block.completed ? 'checked' : ''}>
            </div>
            <div class="task-block-time">${block.start} - ${block.end}</div>
            ${task.note ? `<div class="task-block-note">${task.note}</div>` : ''}
        `;
        
        blockEl.querySelector('.task-block-checkbox').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleBlockCompletion(block.blockId);
        });
        
        blockEl.addEventListener('dragstart', (e) => {
            handleDragStart(e, { type: 'block', blockId: block.blockId });
        });
        blockEl.addEventListener('dragend', handleDragEnd);
        
        timeline.appendChild(blockEl);
    });
    
    // 渲染現在時間指示線
    renderCurrentTimeIndicator();
}

function renderCurrentTimeIndicator() {
    const plan = getCurrentPlan();
    if (!plan) return;
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    if (currentMinutes >= plan.timelineStart && currentMinutes <= plan.timelineEnd) {
        const timeline = document.getElementById('timeline');
        const indicator = document.createElement('div');
        indicator.className = 'current-time-indicator';
        
        const topOffset = ((currentMinutes - plan.timelineStart) / 10) * SLOT_HEIGHT;
        indicator.style.top = `${topOffset}px`;
        
        timeline.appendChild(indicator);
    }
}

function renderArchivedPlans() {
    const archivedList = document.getElementById('archivedList');
    archivedList.innerHTML = '';
    
    const archivedPlans = state.plans.filter(p => p.archived);
    
    if (archivedPlans.length === 0) {
        archivedList.innerHTML = '<p style="text-align: center; color: #999;">沒有封存的計畫</p>';
        return;
    }
    
    archivedPlans.forEach(plan => {
        const item = document.createElement('div');
        item.className = 'archived-item';
        
        const date = new Date(plan.createdAt);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
        
        item.innerHTML = `
            <div class="archived-item-info">
                <h4>${plan.name}</h4>
                <p>建立於：${dateStr}</p>
            </div>
            <button class="btn-restore" data-plan-id="${plan.id}">還原</button>
        `;
        
        item.querySelector('.btn-restore').addEventListener('click', () => {
            restorePlan(plan.id);
            closeModal('settingsModal');
        });
        
        archivedList.appendChild(item);
    });
}

// ===== Modal Management =====
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// ===== Sidebar Toggle =====
let sidebarCollapsed = false;

function toggleSidebar() {
    const sidebar = document.querySelector('.waiting-area');
    sidebarCollapsed = !sidebarCollapsed;
    
    if (sidebarCollapsed) {
        sidebar.classList.add('collapsed');
    } else {
        sidebar.classList.remove('collapsed');
    }
}

// ===== Context Menu =====
let contextMenuPlanId = null;

function showContextMenu(e, planId) {
    e.preventDefault();
    const contextMenu = document.getElementById('contextMenu');
    contextMenuPlanId = planId;
    
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.top = `${e.pageY}px`;
    contextMenu.classList.add('active');
}

function hideContextMenu() {
    const contextMenu = document.getElementById('contextMenu');
    contextMenu.classList.remove('active');
    contextMenuPlanId = null;
}

// ===== Add Break =====
function addBreak() {
    const plan = getCurrentPlan();
    if (!plan) return;
    
    addToUndoStack();
    
    // 找到當前時間或最後一個區塊的結束時間
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    let startMinutes = currentMinutes;
    
    // 如果有區塊，找到最後一個區塊的結束時間
    if (plan.blocks.length > 0) {
        const lastBlock = plan.blocks.reduce((latest, block) => {
            const blockEnd = timeToMinutes(block.end);
            const latestEnd = timeToMinutes(latest.end);
            return blockEnd > latestEnd ? block : latest;
        });
        const lastEndMinutes = timeToMinutes(lastBlock.end);
        if (lastEndMinutes > startMinutes) {
            startMinutes = lastEndMinutes;
        }
    }
    
    const snappedStart = snapToGrid(startMinutes);
    const endMinutes = snappedStart + 5;
    
    // 確保在時間軸範圍內
    if (endMinutes > plan.timelineEnd) {
        plan.timelineEnd = endMinutes;
    }
    
    // 檢查是否可以放置
    if (canPlaceBlock(snappedStart, endMinutes)) {
        // 創建休息任務（如果不存在）
        let breakTask = plan.tasks.find(t => t.name === '休息時間');
        if (!breakTask) {
            breakTask = {
                taskId: generateId(),
                name: '休息時間',
                duration: 999999, // 無限時長
                color: '#95a5a6',
                note: '',
                createdAt: Date.now(),
                remainingDuration: 999999
            };
            plan.tasks.push(breakTask);
        }
        
        createBlock(
            breakTask.taskId,
            minutesToTime(snappedStart),
            minutesToTime(endMinutes)
        );
        
        saveState();
        renderAll();
    } else {
        alert('無法在此時間段添加休息時間，請檢查是否有衝突。');
    }
}

// ===== Event Listeners =====
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    renderAll();
    
    // Toggle sidebar
    document.getElementById('toggleSidebar').addEventListener('click', toggleSidebar);
    
    // Header buttons
    document.getElementById('editPlanName').addEventListener('click', () => {
        const plan = getCurrentPlan();
        if (plan) {
            const newName = prompt('輸入新的計畫名稱：', plan.name);
            if (newName && newName.trim()) {
                renamePlan(plan.id, newName.trim());
            }
        }
    });
    
    // Add break button
    document.getElementById('addBreak').addEventListener('click', addBreak);
    
    // Add task
    document.getElementById('addTask').addEventListener('click', () => {
        openModal('addTaskModal');
    });
    
    document.getElementById('addTaskForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('taskName').value.trim();
        const hours = parseInt(document.getElementById('taskHours').value);
        const minutes = parseInt(document.getElementById('taskMinutes').value);
        const note = document.getElementById('taskNote').value.trim();
        
        const totalMinutes = hours * 60 + minutes;
        
        if (name && totalMinutes > 0) {
            createTask(name, totalMinutes, note);
            closeModal('addTaskModal');
            
            // 清空表單
            document.getElementById('taskName').value = '';
            document.getElementById('taskHours').value = '0';
            document.getElementById('taskMinutes').value = '0';
            document.getElementById('taskNote').value = '';
        } else {
            alert('請填寫任務名稱並設定時間（至少5分鐘）');
        }
    });
    
    document.getElementById('cancelTask').addEventListener('click', () => {
        closeModal('addTaskModal');
    });
    
    // New plan
    document.getElementById('newPlan').addEventListener('click', () => {
        createNewPlan();
    });
    
    // Settings
    document.getElementById('settingsBtn').addEventListener('click', () => {
        renderArchivedPlans();
        openModal('settingsModal');
    });
    
    document.getElementById('closeSettings').addEventListener('click', () => {
        closeModal('settingsModal');
    });
    
    // Context menu
    document.getElementById('contextArchive').addEventListener('click', () => {
        if (contextMenuPlanId) {
            archivePlan(contextMenuPlanId);
            hideContextMenu();
        }
    });
    
    document.getElementById('contextDelete').addEventListener('click', () => {
        if (contextMenuPlanId) {
            if (confirm('確定要刪除此計畫嗎？此操作無法復原。')) {
                deletePlan(contextMenuPlanId);
            }
            hideContextMenu();
        }
    });
    
    // Hide context menu on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.context-menu') && !e.target.closest('.plan-tab')) {
            hideContextMenu();
        }
    });
    
    // Confirm delete
    document.getElementById('confirmDelete').addEventListener('click', () => {
        const plan = getCurrentPlan();
        if (plan) {
            deletePlan(plan.id);
        }
        closeModal('confirmModal');
    });
    
    document.getElementById('cancelDelete').addEventListener('click', () => {
        closeModal('confirmModal');
    });
    
    // Waiting area drop zone
    const taskList = document.getElementById('taskList');
    taskList.addEventListener('dragover', handleDragOver);
    taskList.addEventListener('drop', handleDropToWaiting);
    
    // 更新現在時間指示線（每分鐘更新一次）
    setInterval(() => {
        renderTimeline();
    }, 60000);
});
