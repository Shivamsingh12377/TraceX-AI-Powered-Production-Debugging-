// Temporary in-memory array (taaki DB connect na ho tab bhi crash na kare)
let sampleTasks = [
  { id: 1, name: "Design landing page", project: "Tracex Web", status: "In Progress", priority: "High" },
  { id: 2, name: "API Integration", project: "Backend", status: "Pending", priority: "Medium" }
];

// Get all tasks
exports.getTasks = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      count: sampleTasks.length,
      data: sampleTasks
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// Create new task
exports.createTask = async (req, res) => {
  try {
    const { name, project, priority } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Task name is required" });
    }

    const newTask = {
      id: Date.now(),
      name,
      project: project || "General",
      status: "Pending",
      priority: priority || "Medium"
    };

    sampleTasks.push(newTask);

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: newTask
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};