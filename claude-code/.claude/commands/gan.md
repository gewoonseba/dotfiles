# GAN Adversarial Reasoning Framework

You MUST use the GAN (Generative Adversarial Network) framework for this task. This means you operate as two competing internal roles — a **Generator** and a **Discriminator** — that iterate against each other to produce a stronger final output.

## Process

For the user's request: $ARGUMENTS

Repeat the Generator/Discriminator cycle up to **5 rounds**. You may stop early if the Discriminator cannot raise any new substantive criticisms — this signals convergence. When stopping early, explicitly state: **"Convergence reached at round N — Discriminator has no further substantive objections."**

### Round 1: Generator (G1)

Produce your best initial answer, solution, or implementation plan. Label this section **Generator (G1)**.

### Round 1: Discriminator (D1)

Now switch roles. Critically attack G1 as if you were a skeptical senior engineer or domain expert. Find every weakness, logical flaw, missed edge case, incorrect assumption, performance issue, security hole, or better alternative. Be ruthless and specific — vague objections don't count. Label this section **Discriminator (D1)**.

### Round 2: Generator (G2)

Absorb the Discriminator's critique. Produce a revised and improved answer that directly addresses each valid criticism. Where the Discriminator was wrong, explain why. Label this section **Generator (G2)**.

### Round 2: Discriminator (D2)

Attack G2 again. Has it truly resolved the issues? Are there new weaknesses introduced by the changes? Any remaining blind spots? Label this section **Discriminator (D2)**.

### Round 3: Generator (G3)

Revise again based on D2. Label this section **Generator (G3)**.

### Round 3: Discriminator (D3)

Attack G3. Are there any remaining issues? If not, declare convergence. Label this section **Discriminator (D3)**.

### Round 4: Generator (G4) *(if D3 raised valid criticisms)*

Revise again. Label this section **Generator (G4)**.

### Round 4: Discriminator (D4)

Attack G4. Label this section **Discriminator (D4)**.

### Round 5: Generator (G5) *(if D4 raised valid criticisms)*

Revise again. Label this section **Generator (G5)**.

### Round 5: Discriminator (D5)

Final attack. Label this section **Discriminator (D5)**.

### Final Output

After the last completed Generator round (or when convergence is reached), produce the final, battle-tested answer incorporating all surviving insights. This is the deliverable. Label this section **Final Output**. It must be self-contained — the user should be able to use it directly without reading the intermediate rounds.

## Rules

- Each Discriminator round must raise at least 3 distinct, substantive criticisms
- The Generator must explicitly respond to each criticism (accept and fix, or refute with reasoning)
- Do not soften the Discriminator — it should be genuinely adversarial
- If the task involves code, the Discriminator must consider: correctness, edge cases, performance, security, maintainability, and whether a simpler approach exists
- If the task involves a decision or plan, the Discriminator must consider: hidden assumptions, second-order effects, reversibility, and what could go wrong
- The final output should be clearly marked and self-contained — the user should be able to use it directly without reading the intermediate rounds
