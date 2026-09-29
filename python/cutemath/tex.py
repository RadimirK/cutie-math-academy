"""LaTeX helpers for generators."""
import sympy


def matrix_tex(m, env='pmatrix'):
    m = sympy.Matrix(m)
    rows = [' & '.join(sympy.latex(m[i, j]) for j in range(m.cols)) for i in range(m.rows)]
    return f'\\begin{{{env}}} ' + ' \\\\ '.join(rows) + f' \\end{{{env}}}'
