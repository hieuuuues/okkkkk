class ExerciseTracker {
  constructor() {
    this.initializeData();
    this.lastRecommendationTime = Date.now();
    this.username = "hieuuuues";
    console.log("ExerciseTracker initialized for user:", this.username);
  }

  initializeData() {
    const existingData = localStorage.getItem("exerciseData");
    if (!existingData) {
      const initialData = {
        exercises: {},
        totalCorrect: 0,
        totalWrong: 0,
        lastUpdate: new Date().toISOString(),
        recentExercises: [],
        statistics: {
          learningPatterns: {},
          timeDistribution: {},
          errorPatterns: {},
          improvementRate: {},
        },
      };
      localStorage.setItem("exerciseData", JSON.stringify(initialData));
    }
    console.log("Data initialized:", this.getData());
  }

  startExercise(exerciseId) {
    console.log(`Starting exercise ${exerciseId}`);
    const data = this.getData();

    // Reset exercise data if it exists
    if (data.exercises[exerciseId]) {
      const oldExercise = data.exercises[exerciseId];
      if (oldExercise.completed) {
        // Subtract old values from totals
        data.totalCorrect -= oldExercise.correct || 0;
        data.totalWrong -= oldExercise.wrong || 0;

        // Store previous performance for improvement tracking
        data.statistics.improvementRate[exerciseId] = {
          previousAccuracy:
            (oldExercise.correct / (oldExercise.correct + oldExercise.wrong)) *
            100,
          previousTime: oldExercise.duration,
        };
      }
    }

    // Initialize new exercise data
    data.exercises[exerciseId] = {
      startTime: new Date().toISOString(),
      duration: 0,
      correct: 0,
      wrong: 0,
      completed: false,
      mistakes: [], // Track specific mistakes
      timePerQuestion: [], // Track time spent on each question
      attemptNumber: (data.exercises[exerciseId]?.attemptNumber || 0) + 1,
    };

    this.saveData(data);
    console.log("Exercise started, current data:", data);
  }

  finishExercise(exerciseId, correct, wrong, mistakeDetails = []) {
    console.log(`Finishing exercise ${exerciseId}`, { correct, wrong });
    const data = this.getData();

    correct = parseInt(correct) || 0;
    wrong = parseInt(wrong) || 0;

    const exercise = data.exercises[exerciseId];
    if (exercise) {
      const endTime = new Date();
      const startTime = new Date(exercise.startTime);
      const duration = Math.floor((endTime - startTime) / 60000); // minutes

      // Update exercise statistics
      exercise.duration = duration;
      exercise.correct = correct;
      exercise.wrong = wrong;
      exercise.completed = true;
      exercise.lastAttempt = endTime.toISOString();
      exercise.mistakes = mistakeDetails;
      exercise.accuracy = (correct / (correct + wrong)) * 100;

      // Update improvement tracking
      const previousStats = data.statistics.improvementRate[exerciseId];
      if (previousStats) {
        exercise.improvement = {
          accuracy: exercise.accuracy - previousStats.previousAccuracy,
          time: previousStats.previousTime - duration,
        };
      }

      // Update learning patterns
      this.updateLearningPatterns(data, exerciseId, exercise);

      // Update totals
      data.totalCorrect = (data.totalCorrect || 0) + correct;
      data.totalWrong = (data.totalWrong || 0) + wrong;

      // Update recent exercises
      data.recentExercises = data.recentExercises || [];
      data.recentExercises.push({
        exerciseId,
        correct,
        wrong,
        duration,
        timestamp: endTime.toISOString(),
        accuracy: exercise.accuracy,
      });

      // Keep only recent exercises (last hour)
      const oneHourAgo = new Date(endTime - 3600000);
      data.recentExercises = data.recentExercises.filter(
        (ex) => new Date(ex.timestamp) > oneHourAgo
      );

      this.saveData(data);
      console.log("Exercise finished, updated data:", data);
    }
  }

  updateLearningPatterns(data, exerciseId, exercise) {
    const patterns = data.statistics.learningPatterns;
    patterns[exerciseId] = patterns[exerciseId] || {
      timeOfDay: {},
      accuracyTrend: [],
      commonMistakes: {},
    };

    // Track time of day preferences
    const hour = new Date().getHours();
    patterns[exerciseId].timeOfDay[hour] =
      (patterns[exerciseId].timeOfDay[hour] || 0) + 1;

    // Track accuracy trend
    patterns[exerciseId].accuracyTrend.push({
      timestamp: new Date().toISOString(),
      accuracy: exercise.accuracy,
    });

    // Track common mistakes
    exercise.mistakes.forEach((mistake) => {
      patterns[exerciseId].commonMistakes[mistake.type] =
        (patterns[exerciseId].commonMistakes[mistake.type] || 0) + 1;
    });
  }

  generateRecommendations() {
    const data = this.getData();
    const recommendations = [];

    // Analyze overall performance
    const exercises = Object.values(data.exercises).filter(
      (ex) => ex.completed
    );
    if (exercises.length === 0) return null;

    const averageAccuracy =
      exercises.reduce(
        (sum, ex) => sum + (ex.correct / (ex.correct + ex.wrong)) * 100,
        0
      ) / exercises.length;

    // Generate specific recommendations based on performance
    if (averageAccuracy < 30) {
      recommendations.push(
        "Bạn nên:\n" +
          "- Xem lại lý thuyết cơ bản\n" +
          "- Giải chậm và cẩn thận hơn\n" +
          "- Tập trung vào từng bước giải\n" +
          "- Đặt câu hỏi khi không hiểu"
      );
    } else if (averageAccuracy < 50) {
      recommendations.push(
        "Để cải thiện kết quả:\n" +
          "- Ghi chú lại các lỗi sai\n" +
          "- Luyện tập thêm bài tập cơ bản\n" +
          "- Kiểm tra kỹ đáp án trước khi nộp"
      );
    } else if (averageAccuracy < 70) {
      recommendations.push(
        "Bạn đang tiến bộ tốt! Hãy:\n" +
          "- Thử thách với bài khó hơn\n" +
          "- Cải thiện tốc độ làm bài\n" +
          "- Chia sẻ kinh nghiệm với bạn bè"
      );
    } else {
      recommendations.push(
        "Xuất sắc! Để duy trì kết quả:\n" +
          "- Tìm hiểu các phương pháp giải nhanh\n" +
          "- Hướng dẫn các bạn khác\n" +
          "- Thử sức với các bài tập nâng cao"
      );
    }

    // Add time-based recommendations
    const timePatterns = this.analyzeTimePatterns(data);
    recommendations.push(timePatterns);

    return recommendations;
  }

  analyzeTimePatterns(data) {
    const exercises = Object.values(data.exercises).filter(
      (ex) => ex.completed
    );
    const averageTime =
      exercises.reduce((sum, ex) => sum + ex.duration, 0) / exercises.length;

    if (averageTime > 30) {
      return "Bạn nên cải thiện tốc độ làm bài bằng cách luyện tập thường xuyên hơn.";
    } else if (averageTime < 5) {
      return "Bạn làm bài khá nhanh. Hãy dành thêm thời gian kiểm tra lại kết quả.";
    }
    return "Tốc độ làm bài của bạn đang ở mức phù hợp.";
  }

  getData() {
    const data = localStorage.getItem("exerciseData");
    return data ? JSON.parse(data) : this.initializeData();
  }

  saveData(data) {
    console.log("Saving data:", data);
    localStorage.setItem("exerciseData", JSON.stringify(data));
  }

  getSummary() {
    const data = this.getData();
    const completedExercises = Object.values(data.exercises).filter(
      (ex) => ex.completed
    );

    const summary = {
      totalExercises: Object.keys(data.exercises).length,
      completedExercises: completedExercises.length,
      totalCorrect: completedExercises.reduce(
        (sum, ex) => sum + (ex.correct || 0),
        0
      ),
      totalWrong: completedExercises.reduce(
        (sum, ex) => sum + (ex.wrong || 0),
        0
      ),
      exercises: Object.entries(data.exercises).map(([id, ex]) => ({
        id,
        duration: ex.duration,
        correct: ex.correct || 0,
        wrong: ex.wrong || 0,
        completed: ex.completed,
        percentage: ex.completed
          ? ((ex.correct / (ex.correct + ex.wrong)) * 100).toFixed(1)
          : 0,
        improvement: ex.improvement,
      })),
      recommendations: this.generateRecommendations(),
    };

    console.log("Generated summary:", summary);
    return summary;
  }

  clearData() {
    localStorage.removeItem("exerciseData");
    this.lastRecommendationTime = Date.now();
    this.initializeData();
    console.log("All data cleared and reinitialized");
  }
}

// Create global instance
window.exerciseTracker = new ExerciseTracker();
console.log("ExerciseTracker instance created globally");
