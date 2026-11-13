# SmartSort AI — oral defense guide

## Presentation script (about 6–7 minutes, including a short live demonstration)

Rehearse at about 135–145 words per minute. The spoken script is about 820 words; allow roughly 40 seconds for clicks and pauses. Bracketed instructions are not spoken. Use the full [demonstration guide](DEMO_SCENARIOS.md) during rehearsal; do not attempt all three complete runs in the timed presentation.

### 1. Introduction — 0:00–0:25

Good morning. My project is SmartSort AI, an intelligent recycling robot simulation. It demonstrates three ideas from AI Fundamentals: Bayesian inference for perception, a Markov decision process for decisions, and breadth-first search for navigation. The aim is to make their connection visible, from an uncertain sensor reading to a completed sorting action.

### 2. Problem statement — 0:25–0:55

A recycling robot cannot always trust its sensor. A Plastic observation might come from a Paper object. Sorting immediately can produce a costly mistake, but the robot has only a limited number of inspections. After choosing a material, it must reach the appropriate bin while avoiding obstacles. Our problem therefore combines uncertainty, sequential decisions, and path planning in one small environment.

### 3. Architecture — 0:55–1:30

The website runs entirely in the browser using React and TypeScript. Pure algorithm modules calculate results. A central controller connects those results, while a separate playback transport manages timing, pause, stepping, and reset. This separation means changing animation speed does not change probabilities or paths. The Python notebook implements the same model independently. It compares its results with seven reference runs from the actual TypeScript controller. There is no backend or external AI service.

### 4. Bayesian inference — 1:30–2:20

Bayesian inference updates a belief when new evidence arrives. We begin with equal probabilities for Plastic and Paper. The sensor reports Plastic with probability 0.9 for a Plastic object, but also with probability 0.2 for a Paper object. For a Plastic reading, the weighted probabilities are 0.45 and 0.10. Their sum, 0.55, is the evidence. Dividing by this evidence gives approximately 81.82 percent Plastic and 18.18 percent Paper.

These are model-based probabilities, not certainty. If we inspect again, the current posterior becomes the next prior. We assume the material remains fixed and successive sensor readings are independent when the material is known. This allows evidence to accumulate instead of starting over after every inspection.

### 5. Markov decision process — 2:20–3:30

The decision model has two actions: SORT and INSPECT AGAIN. A correct sort earns ten points and a wrong sort loses eight by default. Inspection earns three points when the current proposal is correct and two when it is wrong.

The planning state contains the Bayesian belief and the number of further inspections available. Because the true material is hidden, this is a belief-state MDP representation of a partially observed problem. The next belief depends on the current belief, the observation model, and the chosen action, rather than the entire observation history.

A Bellman update compares sorting now with inspecting now and then following the best future policy. Each possible observation contributes its probability multiplied by the next state's value. At 81.82 percent confidence, immediate SORT is about 6.73 and immediate inspection is 2.82. However, with two further reads, inspection's total action value is about 14.37. Therefore, the sequential planner inspects again.

At zero remaining reads, inspection is unavailable. A profitable sort finishes the decision process; otherwise, the robot stops unresolved with value zero. Positive inspection rewards often encourage using the full budget. This is an explicit limitation of our chosen reward model.

### 6. Breadth-first search — 3:30–4:10

Once SORT is selected, the proposed material determines the destination bin. BFS uses a first-in, first-out queue to explore the four-by-four floor. It tracks discovered cells, avoids obstacles, and stores each cell's parent. Parent links reconstruct the final route.

Every movement has the same cost. BFS explores all cells at one distance before moving to a greater distance, so the first reached destination has a shortest path. The animated exploration order comes from actual queue removals. It is different from the final route. If no route exists, the robot reports an unreachable destination rather than moving through obstacles.

### 7. Live demonstration — 4:10–5:35

[Use Scenario B, already configured before speaking. Advance to the first MDP result.]

Here the selected object is Paper, but the first predefined reading is Plastic. The prior is twenty percent Plastic. The resulting belief is only about 52.94 percent Plastic. The agent chooses another inspection. Notice that the planner does not know the object's true material or the next scripted reading.

[Advance through the second Bayes stage, then continue to the result.]

The Paper reading changes the proposed material. A third inspection produces about 98.27 percent Paper confidence, and the robot follows its computed route to the Paper bin. The final result compares the prediction with the object's actual category. Predefined readings make this demonstration reproducible. Seeded imperfect sensing is also available.

### 8. Limitations — 5:35–6:05

This is an educational simulation with two material classes, a fixed sensor model, static obstacles, and deterministic movement. Cardboard belongs to Paper. Confidence depends on the model assumptions, and a confident agent can still sort incorrectly. There is no camera, physical robot, online learning, or trained neural network. Browser history is local, and the notebook checks algorithms rather than animations.

### 9. Conclusion — 6:05–6:25

SmartSort shows how perception, decisions, and navigation can work as one agent. Bayes updates uncertainty, finite-horizon planning chooses when to act, and BFS finds a shortest feasible route. Separate implementations, deterministic scenarios, and automated checks make the project understandable and reproducible. Thank you; I am ready for your questions.

## Fifteen likely instructor questions

1. **Why use Bayesian inference?** It combines a prior belief with a known imperfect observation model and gives normalized probabilities that can be updated sequentially.
2. **How is uncertainty modeled?** With conditional likelihoods, such as P(PLASTIC observation | Paper) = 0.2, rather than a perfectly accurate label. The sensor and inference use the same matrix.
3. **Why is the posterior not 90% after a Plastic reading?** The 0.9 likelihood is not the posterior. Bayes also accounts for the Paper alternative and priors: 0.45 / 0.55 = 0.81818.
4. **What changes after another inspection?** The previous posterior becomes the next prior. The likelihood model stays fixed within that run.
5. **Why use an MDP instead of choosing the highest confidence material immediately?** The agent must compare acting now with the expected value of obtaining more information under a finite budget and reward model.
6. **What makes this an MDP?** Its state is belief plus remaining reads, it has defined actions/rewards and probabilistic belief transitions, and its next-state distribution depends on that state and action. The hidden-material problem is represented as a belief-state MDP.
7. **What does a Bellman update do?** It computes an action's immediate expected reward plus the probability-weighted optimal value of its successor states, then chooses the larger value.
8. **What are the transition probabilities?** For inspection, P(o | belief) is the sum of likelihood times current material belief. The observation determines the Bayesian successor belief. SORT transitions to a terminal state.
9. **What is the horizon?** The number of additional inspections available after the current reading. With a three-read limit, the first decision has horizon two; the final decision has horizon zero.
10. **Why does the agent inspect even at high confidence?** Inspection has positive specified rewards, and its Bellman value includes future sorting reward. This can favor consuming the budget. A more realistic model might charge sensing cost, but that would be a different reward specification.
11. **Is the agent doing reinforcement learning?** No. It plans with a known observation/reward model; it does not learn transition probabilities, rewards, or a policy from training data.
12. **Why does BFS guarantee a shortest path?** FIFO exploration visits distance layers in order on an unweighted graph. The first target reached has minimum edge count. This does not imply optimality for different movement costs.
13. **Why not DFS or A*?** DFS does not generally guarantee a shortest route. A* could work with a valid heuristic, but BFS is simple and sufficient for sixteen uniformly weighted cells.
14. **How are the algorithms genuinely connected?** Sensor output enters Bayes; its posterior enters the Bellman planner. SORT selects a bin from the inferred material; that bin becomes BFS's target. The robot follows that exact route before correctness is evaluated.
15. **How do you verify reproducibility and failure handling?** Fixed seeds and predefined readings make runs repeatable. Tests cover wrong observations, sequential beliefs, both decisions, unreachable paths, unresolved classification, reset, and saved replay. Python results are compared with seven TypeScript controller fixtures using numeric tolerance.

## Defense preparation

- Read [DEMO_SCENARIOS.md](DEMO_SCENARIOS.md) and run all three scenarios once before presenting.
- Keep the executed notebook and `reference_results.json` together; keep a browser tab ready before disconnecting from the network.
- Distinguish immediate reward from total Bellman action value, and certainty from model-based confidence.
- Say “simulated sensor activity,” not physical signal measurements. Do not claim robot hardware, training, or deployment results.
- Use [SUBMISSION_REPORT.md](SUBMISSION_REPORT.md) for the commands and checks actually executed for this submission.

