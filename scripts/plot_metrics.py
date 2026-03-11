import json
import pandas as pd
import matplotlib.pyplot as plt

data_str = """
{"frame_id": "frame", "final_score": 4.1, "by_group": {"light": {"score": 0.3802219233473348, "disagreement": 0.16523268123707005, "per_agent": {"light_A": 0.5454546045844049, "light_B": 0.21498924211026477}}, "composition": {"score": 0.42942960506270395, "disagreement": 0.00018000000000001348, "per_agent": {"comp_A": 0.42960960506270396, "comp_B": 0.42924960506270393}}, "sketch": {"score": 0.19157922323600107, "disagreement": 0.01464, "per_agent": {"sketch_A": 0.20621922323600106, "sketch_B": 0.17693922323600106}}, "color": {"score": 0.4135065617094363, "disagreement": 0.0006125000000000158, "per_agent": {"color_A": 0.4141190617094363, "color_B": 0.41289406170943627}}, "style": {"score": 0.398964111328125, "disagreement": 0.00244999999999998, "per_agent": {"style_A": 0.40141411132812493, "style_B": 0.396514111328125}}, "percept": {"score": 0.12916167037466644, "disagreement": 0.0002763640663001887, "per_agent": {"percept_A": 0.12886649510340067, "percept_B": 0.12941922323600105}}, "faithfulness": {"score": 0.16853094344525865, "disagreement": 0.17515134346374933, "per_agent": {"faith_A": 0.35030268692749866, "faith_B": 0.0}}, "control": {"score": 0.43712300520834035, "disagreement": 0.13899995833334028, "per_agent": {"control_A": 0.298123046875, "control_B": 0.5761229635416806}}, "robustness": {"score": 0.32916447970704915, "disagreement": 0.008000000000000007, "per_agent": {"robust_A": 0.33599999999999997, "robust_B": 0.31999999999999995}}, "efficiency": {"score": 0.20000000000001905, "disagreement": 0.20000000000001905, "per_agent": {"eff_A": 0.4000000000000381, "eff_B": 0.0}}, "stability": {"score": 0.33628078299910763, "disagreement": 0.0840701957497769, "per_agent": {"stab_A": 0.2522105872493307, "stab_B": 0.4203509787488845}}}, "flags": [["light", "handoff_needed"], ["composition", "handoff_needed"], ["sketch", "handoff_needed"], ["color", "handoff_needed"], ["style", "handoff_needed"], ["percept", "handoff_needed"], ["faithfulness", "handoff_needed"], ["control", "handoff_needed"], ["robustness", "handoff_needed"], ["efficiency", "handoff_needed"], ["stability", "handoff_needed"]]}
"""

data = json.loads(data_str)
by_group = data['by_group']

categories = []
scores = []
disagreements = []
agent_a_scores = []
agent_b_scores = []

for cat, details in by_group.items():
    categories.append(cat)
    scores.append(details['score'])
    disagreements.append(details['disagreement'])
    
    agent_keys = sorted(details['per_agent'].keys())
    val_a = next((v for k, v in details['per_agent'].items() if k.endswith('_A')), 0)
    val_b = next((v for k, v in details['per_agent'].items() if k.endswith('_B')), 0)
    
    agent_a_scores.append(val_a)
    agent_b_scores.append(val_b)

df = pd.DataFrame({
    'Category': categories,
    'Score': scores,
    'Disagreement': disagreements,
    'Agent A Score': agent_a_scores,
    'Agent B Score': agent_b_scores
})

# Plotting
fig, axes = plt.subplots(3, 1, figsize=(10, 18))

# Plot 1: Overall Scores
bars1 = axes[0].bar(df['Category'], df['Score'], color='skyblue')
axes[0].bar_label(bars1, fmt='%.2f', padding=3)  # Adding labels
axes[0].set_title('Overall Score by Category')
axes[0].set_ylabel('Score')
axes[0].set_ylim(0, max(df['Score'].max(), df['Agent A Score'].max(), df['Agent B Score'].max()) * 1.2)


# Plot 2: Agent Comparison
x = range(len(categories))
width = 0.35
bars2a = axes[1].bar([i - width/2 for i in x], df['Agent A Score'], width, label='Agent A')
bars2b = axes[1].bar([i + width/2 for i in x], df['Agent B Score'], width, label='Agent B')
axes[1].bar_label(bars2a, fmt='%.2f', padding=3) # Adding labels
axes[1].bar_label(bars2b, fmt='%.2f', padding=3) # Adding labels
axes[1].set_title('Agent A vs Agent B Scores')
axes[1].set_xticks(x)
axes[1].set_xticklabels(categories)
axes[1].legend()
axes[1].set_ylabel('Score')
axes[1].set_ylim(0, max(df['Score'].max(), df['Agent A Score'].max(), df['Agent B Score'].max()) * 1.2)

# Plot 3: Disagreement
bars3 = axes[2].bar(df['Category'], df['Disagreement'], color='salmon')
axes[2].bar_label(bars3, fmt='%.2f', padding=3) # Adding labels
axes[2].set_title('Disagreement by Category')
axes[2].set_ylabel('Disagreement Score')
axes[2].set_ylim(0, df['Disagreement'].max() * 1.2)

plt.tight_layout()
plt.savefig('visualization_5.png')
print(df.to_markdown())