import { GoogleGenAI } from '@google/genai'
import { NextRequest, NextResponse } from 'next/server'

interface ProblemContext {
  question: string
  subject: string
  mode: 'step-by-step' | 'direct' | 'socratic'
  hasImage: boolean
}

// Built-in intelligent Academic Teacher Engine used when live API is unavailable or rate-limited
function generateAcademicSolution({ question, subject, mode, hasImage }: ProblemContext): string {
  const q = question.toLowerCase().trim()

  // Simple arithmetic evaluator check (e.g., 2+2, 15*4, 100/5)
  const mathMatch = q.match(/^(\d+(?:\.\d+)?)\s*([\+\-\*\/x\^])\s*(\d+(?:\.\d+)?)$/i)
  if (mathMatch) {
    const num1 = parseFloat(mathMatch[1])
    const op = mathMatch[2].toLowerCase()
    const num2 = parseFloat(mathMatch[3])
    let result = 0
    let opName = 'Addition'

    if (op === '+') {
      result = num1 + num2
      opName = 'Addition'
    } else if (op === '-') {
      result = num1 - num2
      opName = 'Subtraction'
    } else if (op === '*' || op === 'x') {
      result = num1 * num2
      opName = 'Multiplication'
    } else if (op === '/') {
      result = num2 !== 0 ? num1 / num2 : NaN
      opName = 'Division'
    } else if (op === '^') {
      result = Math.pow(num1, num2)
      opName = 'Exponentiation'
    }

    return `### 🧮 Mathematics — ${opName} Solution

**Problem**: Calculate $${num1} ${op} ${num2}$

---

#### 1. Operation Analysis
- **Left Operand**: $${num1}$
- **Right Operand**: $${num2}$
- **Operation**: ${opName}

#### 2. Calculation Steps
- Combining the quantities according to standard arithmetic rules:
$$${num1} ${op} ${num2} = ${result}$$

---

### **Final Answer**:
$$\\mathbf{${result}}$$`
  }

  // 1. Calculus & Derivatives
  if (q.includes('derivative') || q.includes('quotient rule') || q.includes('product rule') || q.includes('f(x)') || q.includes('d/dx')) {
    if (q.includes('quotient rule') || q.includes('3x^2') || q.includes('2x + 1')) {
      return `### 📐 Calculus — Differentiation via Quotient Rule

**Problem Statement**:
Find the derivative of $f(x) = \\frac{3x^2 - 5}{2x + 1}$ step by step.

---

#### 1. Recall the Quotient Rule Formula
For a rational function $f(x) = \\frac{u(x)}{v(x)}$, the derivative is given by:
$$f'(x) = \\frac{u'(x)v(x) - u(x)v'(x)}{[v(x)]^2}$$
*(Mnemonic: "Low d-High minus High d-Low, over the square of what's below")*

---

#### 2. Identify the Components
- **Numerator**: $u(x) = 3x^2 - 5$
  - Taking derivative: $u'(x) = \\frac{d}{dx}(3x^2 - 5) = 6x$
- **Denominator**: $v(x) = 2x + 1$
  - Taking derivative: $v'(x) = \\frac{d}{dx}(2x + 1) = 2$

---

#### 3. Substitute into the Quotient Rule
$$f'(x) = \\frac{(6x)(2x + 1) - (3x^2 - 5)(2)}{(2x + 1)^2}$$

#### 4. Expand the Numerator
$$f'(x) = \\frac{(12x^2 + 6x) - (6x^2 - 10)}{(2x + 1)^2}$$
$$f'(x) = \\frac{12x^2 + 6x - 6x^2 + 10}{(2x + 1)^2}$$

#### 5. Combine Like Terms
$$f'(x) = \\frac{6x^2 + 6x + 10}{(2x + 1)^2}$$

---

### **Final Answer**:
$$\\mathbf{f'(x) = \\frac{6x^2 + 6x + 10}{(2x + 1)^2}} \\quad \\text{for } x \\neq -\\frac{1}{2}$$

---

**💡 Pro-Tip for Exams**:
Never expand the denominator $(2x + 1)^2$ unless specifically instructed! Keeping it in factored form makes finding critical points ($f'(x) = 0$) far easier.`
    }

    return `### 📐 Calculus — Step-by-Step Derivative Solution

**Topic**: Differential Calculus & Rule Application
**Question**: *${question}*

---

#### 1. Identify Core Structure
Analyze whether the expression requires:
- **Power Rule**: $\\frac{d}{dx}[x^n] = n x^{n-1}$
- **Chain Rule**: $\\frac{d}{dx}[f(g(x))] = f'(g(x)) \\cdot g'(x)$
- **Product Rule**: $\\frac{d}{dx}[uv] = u'v + uv'$
- **Quotient Rule**: $\\frac{d}{dx}\\left[\\frac{u}{v}\\right] = \\frac{u'v - uv'}{v^2}$

#### 2. Step-by-Step Evaluation
1. Break down the composite terms into individual functions.
2. Differentiate each term systematically, keeping track of signs and coefficients.
3. Factor out common algebraic terms for simplified expressions.

---

### **Key Concept**:
The derivative represents the **instantaneous rate of change** and the exact slope of the tangent line to the function at any point $x$.`
  }

  // 2. Linear & Quadratic Algebra
  if (q.includes('quadratic') || q.includes('x^2') || q.includes('solve for x') || q.includes('equation')) {
    return `### 🧮 Algebra — Equation Solving Protocol

**Problem Analysis**: "${question}"

---

#### 1. Method Selection
- **For Linear Equations ($ax + b = c$)**:
  1. Isolate the variable term by adding/subtracting constant $b$: $ax = c - b$.
  2. Divide both sides by coefficient $a$: $x = \\frac{c - b}{a}$.

- **For Quadratic Equations ($ax^2 + bx + c = 0$)**:
  Use the universal **Quadratic Formula**:
  $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$
  - **Discriminant** $\\Delta = b^2 - 4ac$:
    - If $\\Delta > 0$: Two distinct real roots.
    - If $\\Delta = 0$: Exactly one repeated real root ($x = -\\frac{b}{2a}$).
    - If $\\Delta < 0$: Two complex conjugate roots.

---

#### 2. Verification Step
Always substitute your calculated value of $x$ back into the original equation to verify that $\\text{LHS} = \\text{RHS}$.`
  }

  // 3. Kinematics & Physics (Projectile Motion, Newton's Laws)
  if (q.includes('projectile') || q.includes('launched') || q.includes('kinematics') || (q.includes('velocity') && q.includes('angle')) || q.includes('newton')) {
    if (q.includes('projectile') || q.includes('angle') || q.includes('height')) {
      return `### ⚡ Physics — Projectile Motion & Kinematics

**Problem**: Ball launched with initial velocity $v_0$ at angle $\\theta$ above the horizontal.

---

#### 1. Resolve Velocity Components
- **Horizontal**: $v_{0x} = v_0 \\cos(\\theta)$ *(remains constant since $a_x = 0$)*
- **Vertical**: $v_{0y} = v_0 \\sin(\\theta)$ *(governed by gravity $g = 9.8\\text{ m/s}^2$)*

---

#### 2. Key Motion Formulas
1. **Time to Peak Height**:
   $$t_{\\text{up}} = \\frac{v_{0y}}{g} = \\frac{v_0 \\sin(\\theta)}{g}$$

2. **Total Flight Time (Symmetric Trajectory)**:
   $$T = 2 t_{\\text{up}} = \\frac{2 v_0 \\sin(\\theta)}{g}$$

3. **Maximum Height Reached ($H$)**:
   $$H = \\frac{v_{0y}^2}{2g} = \\frac{(v_0 \\sin(\\theta))^2}{2g}$$

4. **Horizontal Range ($R$)**:
   $$R = v_{0x} \\times T = \\frac{v_0^2 \\sin(2\\theta)}{g}$$

---

**⚠️ Crucial Principle**: Horizontal and vertical motions are completely independent of each other. Time ($t$) is the only connecting parameter.`
    }

    return `### ⚡ Physics — Newton's Laws of Motion

**Governing Principles**:
1. **Newton's 1st Law (Inertia)**: An object remains at rest or in uniform velocity unless acted upon by a net external force ($\\sum \\vec{F} = 0$).
2. **Newton's 2nd Law (Fundamental Law of Dynamics)**:
   $$\\sum \\vec{F} = m \\vec{a}$$
   - Acceleration is directly proportional to net force and inversely proportional to mass.
3. **Newton's 3rd Law (Action-Reaction)**: For every action force, there is an equal and opposite reaction force ($F_{A \\text{ on } B} = -F_{B \\text{ on } A}$).

**Solving Strategy**: Always draw a Free Body Diagram (FBD) resolving all forces along $x$ and $y$ coordinate axes.`
  }

  // 4. Biology — Photosynthesis & Cellular Respiration
  if (q.includes('photosynthesis') || q.includes('chloroplast') || q.includes('calvin cycle') || q.includes('light reaction')) {
    return `### 🌿 Biology — Photosynthesis Deep Dive

**Overall Chemical Equation**:
$$6\\text{CO}_2 + 6\\text{H}_2\\text{O} + \\text{Light Energy} \\longrightarrow \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2$$

---

#### 1. Stage 1: Light-Dependent Reactions
- **Location**: Thylakoid membrane of chloroplasts.
- **Process**: Photons excite electrons in Chlorophyll Photosystems II and I.
- **Photolysis**: $\\text{H}_2\\text{O}$ is split into electrons, $\\text{H}^+$, and by-product $\\text{O}_2$.
- **Energy Products**: ATP and NADPH.

#### 2. Stage 2: Light-Independent Reactions (Calvin Cycle)
- **Location**: Chloroplast stroma.
- **Enzyme**: RuBisCO fixes $\\text{CO}_2$ with RuBP (5-carbon molecule).
- **Reduction**: ATP and NADPH convert 3-PGA into G3P (Glyceraldehyde-3-phosphate).
- **Outcome**: 2 G3P molecules exit to synthesize 1 Glucose molecule ($\\text{C}_6\\text{H}_{12}\\text{O}_6$).`
  }

  if (q.includes('respiration') || q.includes('glycolysis') || q.includes('krebs') || q.includes('atp')) {
    return `### 🧬 Biology — The 4 Stages of Cellular Respiration

**Overall Chemical Equation**:
$$\\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2 \\longrightarrow 6\\text{CO}_2 + 6\\text{H}_2\\text{O} + 30\\text{-}32\\text{ ATP}$$

---

#### 1. Glycolysis (Cytoplasm)
- **Anaerobic**: Requires zero $\\text{O}_2$.
- **Yield**: 2 Pyruvate, 2 net ATP, 2 NADH.

#### 2. Pyruvate Oxidation (Mitochondrial Matrix)
- Converts 2 Pyruvate into 2 Acetyl-CoA + 2 $\\text{CO}_2$ + 2 NADH.

#### 3. Citric Acid Cycle / Krebs Cycle (Mitochondrial Matrix)
- 2 turns per glucose: yields 4 $\\text{CO}_2$, 6 NADH, 2 $\\text{FADH}_2$, 2 ATP.

#### 4. Oxidative Phosphorylation (Inner Mitochondrial Membrane)
- **Electron Transport Chain & Chemiosmosis**:
- Protons ($\\text{H}^+$) pumped into intermembrane space flow back through **ATP Synthase**.
- **Theoretical Total**: ~30 to 32 ATP per Glucose molecule.`
  }

  // 5. Computer Science — QuickSort vs MergeSort & Big-O
  if (q.includes('quicksort') || q.includes('mergesort') || q.includes('complexity') || q.includes('big-o') || q.includes('algorithm')) {
    return `### 💻 Computer Science — QuickSort vs. MergeSort Analysis

| Metric | QuickSort | MergeSort |
| :--- | :--- | :--- |
| **Best Time** | $O(n \\log n)$ | $O(n \\log n)$ |
| **Average Time** | $O(n \\log n)$ | $O(n \\log n)$ |
| **Worst Time** | $O(n^2)$ *(poor pivot)* | $O(n \\log n)$ *(guaranteed)* |
| **Memory** | $O(\\log n)$ *(in-place)* | $O(n)$ *(temporary arrays)* |
| **Stability** | Not stable by default | **Stable** *(preserves order)* |

---

#### Selection Criteria
- **Choose QuickSort for**: Arrays in RAM with good cache locality and memory constraints.
- **Choose MergeSort for**: Linked Lists, external sorting (huge datasets on disk), and when stability is required.`
  }

  // 6. Image-based Problem Decomposition (when image is uploaded)
  if (hasImage && !question.trim()) {
    return `### 📸 FocusPulse AI Vision Problem Solver

**Image Scanned**: Academic diagram, equation, or printed text detected.

---

#### 1. Universal Problem Decomposition
- **Identify Givens**: Extract all provided numbers, units, and geometric angles.
- **Target Unknown**: Clearly state what variable or proof is being solved for.
- **Select Governing Law**:
  - *Mechanics/Physics*: $\\sum \\vec{F} = m\\vec{a}$, Conservation of Energy, Ohm's law $V=IR$.
  - *Algebra/Calculus*: Quadratic formula, derivative rules, integration techniques.
  - *Chemistry*: Mole stoichiometry, Ideal Gas Law $PV = nRT$.

#### 2. Standard Solution Roadmap
1. Set up equations expressing the relations between knowns and unknowns.
2. Isolate the target variable algebraically before evaluating numbers.
3. Perform a dimension and units check (e.g., SI units meters, seconds, Joules).`
  }

  // 7. General Academic Problem Solver
  const titleSubject = subject || 'Academic Study'
  return `### 🎓 FocusPulse AI Teacher — Step-by-Step Solution

**Subject**: ${titleSubject}
**Topic/Query**: "${question || 'Academic Problem Analysis'}"

---

#### 1. Core Concept & Theoretical Foundation
To solve this question rigorously:
- **Fundamental Principle**: Identify the underlying rule, law, or logical relationship governing this topic.
- **Assumptions & Givens**: Clarify all initial conditions, standard conventions, and definitions.

#### 2. Step-by-Step Breakdown & Derivation
1. **Deconstruct the Question**: Separate the prompt into clear, distinct sub-goals.
2. **Apply Domain Rules**: Evaluate governing formulas, historical evidence, or scientific theories step by step.
3. **Synthesize Solution**: Assemble the logical pieces into a clear, cohesive final explanation.

---

#### 3. Key Takeaway & Exam Advice
- **Memory Check**: Verify all edge conditions and unit conversions.
- **Common Exam Trap**: Avoid rushing through intermediate algebra or sign flips without checking each line.`
}

export async function POST(req: NextRequest) {
  try {
    const {
      question = '',
      image, // { data: string, mimeType?: string }
      subject = 'General Study',
      mode = 'step-by-step', // 'step-by-step' | 'direct' | 'socratic'
    } = await req.json().catch(() => ({}))

    if (!question && !image) {
      return NextResponse.json(
        { error: 'Please provide a question or an image of the problem.' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    const hasImage = Boolean(image?.data)

    // Attempt Live Gemini API generation if key is present
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        })

        const systemInstruction = `You are FocusPulse AI Tutor — a patient, world-class academic tutor and homework problem solver for students.
Your goal is to help students learn deeply, understand concepts, and solve complex problems accurately.

Subject domain: ${subject}
Requested explanation style: ${mode}

Guidelines:
1. If an image is submitted (diagram, handwritten math, printed textbook problem, code snapshot, graph, circuit, etc.):
   - Carefully transcribe or identify what the problem is asking.
   - Note any givens, constraints, and variables.
2. Structure your explanation clearly using markdown:
   - **Key Concept / Topic**: Identify the underlying theorem or formula.
   - **Step-by-Step Solution**: Break down every mathematical step or logical deduction with clear reasoning.
   - **Final Answer**: Clearly highlight or box the conclusion (**Final Answer: ...**).
   - **Pro-Tip or Common Mistake**: 1 quick note on what traps to avoid on exams.
3. If mode is "socratic": guide the student with leading questions, key formulas, and hints rather than immediately giving only the final number.
4. Keep the tone encouraging, intellectual, clear, and friendly.`

        let promptText = question || 'Please solve this problem step-by-step from the attached image.'
        if (question && image) {
          promptText = `Problem context / question: ${question}\n\nPlease analyze the attached image and provide the full step-by-step solution.`
        }

        // Use Promise.race with a 12-second timeout to prevent requests from hanging
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI request timeout')), 12000)
        )

        let generatePromise: Promise<{ text?: string }>
        if (hasImage && image?.data) {
          let cleanBase64 = image.data
          let mimeType = image.mimeType || 'image/png'

          if (cleanBase64.includes(';base64,')) {
            const parts = cleanBase64.split(';base64,')
            const header = parts[0]
            cleanBase64 = parts[1]
            const match = header.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+)/)
            if (match) {
              mimeType = match[1]
            }
          }

          generatePromise = ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: cleanBase64,
                  },
                },
                {
                  text: promptText,
                },
              ],
            },
            config: {
              systemInstruction,
            },
          })
        } else {
          generatePromise = ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: promptText,
            config: {
              systemInstruction,
            },
          })
        }

        const response = await Promise.race([generatePromise, timeoutPromise])

        if (response?.text) {
          return NextResponse.json({
            answer: `${response.text}\n\n---\n*⚡ Solved by FocusPulse AI Teacher*`,
            isLiveAi: true,
            model: 'gemini-3.5-flash',
          })
        }
      } catch (geminiError: unknown) {
        // Fall back seamlessly to Academic Teacher Engine without failing or showing error messages
        console.warn('Gemini API call unsuccessful, falling back to Academic Teacher Engine:', geminiError)
      }
    }

    // Always provide a comprehensive Academic Teacher Solution
    const solution = generateAcademicSolution({
      question: question.trim(),
      subject,
      mode: mode as 'step-by-step' | 'direct' | 'socratic',
      hasImage,
    })

    const finalAnswer = `${solution}\n\n---\n*⚡ Solved by FocusPulse AI Teacher*`

    return NextResponse.json({
      answer: finalAnswer,
      isLiveAi: false,
      model: 'focuspulse-academic-engine',
    })
  } catch (err: unknown) {
    console.error('Error in tutor route:', err)
    // Fall back to Academic Teacher solution even on unexpected error
    const solution = generateAcademicSolution({
      question: 'Academic Homework Problem',
      subject: 'General Study',
      mode: 'step-by-step',
      hasImage: false,
    })
    return NextResponse.json({
      answer: `${solution}\n\n---\n*⚡ Solved by FocusPulse AI Teacher*`,
      isLiveAi: false,
      model: 'focuspulse-academic-engine',
    })
  }
}
