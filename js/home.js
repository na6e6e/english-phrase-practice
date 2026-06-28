'use strict';

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-reset').addEventListener('click', () => {
    if (confirm('学習進捗をリセットしますか？この操作は元に戻せません。')) {
      resetProgress();
      location.reload();
    }
  });

  initHome();
});

async function initHome() {
  let data;
  try {
    const res = await fetch('./data/questions.json');
    if (!res.ok) throw new Error('fetch failed');
    data = await res.json();
  } catch (e) {
    console.error('Failed to load questions.json:', e);
    return;
  }

  const progress = getProgress();

  // ── Compute stats ──
  let total = 0;
  let correct = 0;
  let incorrect = 0;

  for (const theme of data.themes) {
    for (const q of theme.questions) {
      total++;
      const state = progress[q.id];
      if (state?.status === 'correct') correct++;
      else if (state?.status === 'incorrect') incorrect++;
    }
  }

  const unanswered = total - correct - incorrect;

  // ── Render pie chart ──
  renderChart(unanswered, correct, incorrect, total);

  // ── Render stat counters ──
  document.getElementById('stat-unanswered').textContent = unanswered;
  document.getElementById('stat-correct').textContent = correct;
  document.getElementById('stat-incorrect').textContent = incorrect;

  // ── Render theme cards ──
  const container = document.getElementById('theme-cards');
  for (const theme of data.themes) {
    const themeCorrect = theme.questions.filter(
      q => progress[q.id]?.status === 'correct'
    ).length;

    const remaining = theme.questions.length - themeCorrect;
    const allHref        = `quiz.html?theme=${encodeURIComponent(theme.id)}`;
    const incompleteHref = `quiz.html?theme=${encodeURIComponent(theme.id)}&filter=incomplete`;

    // Default: incomplete mode when questions remain, otherwise all questions
    const card = document.createElement('a');
    card.href = remaining > 0 ? incompleteHref : allHref;
    card.className = 'theme-card';
    card.innerHTML = `
      <div class="theme-icon">${theme.icon}</div>
      <div class="theme-info">
        <div class="theme-name">${theme.name}</div>
        <div class="theme-progress">${themeCorrect} / ${theme.questions.length} 問正解</div>
      </div>
      <div class="theme-arrow">›</div>
    `;

    const entry = document.createElement('div');
    entry.className = 'theme-entry';
    entry.appendChild(card);

    // Sub-link: always allow full quiz
    const allLink = document.createElement('a');
    allLink.href = allHref;
    allLink.className = 'btn-incomplete-link';
    allLink.textContent = `全問出題 (${theme.questions.length}問)`;
    entry.appendChild(allLink);

    container.appendChild(entry);
  }

  // ── Review mode button ──
  const flaggedIds = getFlaggedIds();
  if (flaggedIds.length > 0) {
    document.getElementById('review-section').style.display = 'block';
    document.getElementById('flagged-count').textContent = flaggedIds.length;
  }
}

function renderChart(unanswered, correct, incorrect, total) {
  const ctx = document.getElementById('progress-chart').getContext('2d');

  // Custom plugin: draw total number in the center of the doughnut
  const centerTextPlugin = {
    id: 'centerText',
    afterDraw(chart) {
      const { ctx: c, chartArea } = chart;
      if (!chartArea) return;
      const cx = (chartArea.left + chartArea.right) / 2;
      const cy = (chartArea.top + chartArea.bottom) / 2;

      c.save();
      c.textAlign = 'center';
      c.textBaseline = 'alphabetic';
      c.font = 'bold 26px system-ui, -apple-system, sans-serif';
      c.fillStyle = '#1E293B';
      c.fillText(String(total), cx, cy + 6);
      c.font = '13px system-ui, -apple-system, sans-serif';
      c.fillStyle = '#64748B';
      c.textBaseline = 'top';
      c.fillText('問', cx, cy + 10);
      c.restore();
    }
  };

  new Chart(ctx, {
    type: 'doughnut',
    plugins: [centerTextPlugin],
    data: {
      labels: ['未回答', '正解', '不正解'],
      datasets: [{
        data: total > 0 ? [unanswered, correct, incorrect] : [1, 0, 0],
        backgroundColor: ['#94A3B8', '#10B981', '#EF4444'],
        borderColor: '#ffffff',
        borderWidth: 3,
        hoverOffset: 4,
      }]
    },
    options: {
      cutout: '62%',
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1.4,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { size: 13 },
            padding: 16,
            usePointStyle: true,
            pointStyleWidth: 10,
          }
        },
        tooltip: {
          callbacks: {
            label(context) {
              if (total === 0) return '未回答: 0問';
              const val = context.parsed;
              const pct = Math.round((val / total) * 100);
              return ` ${context.label}: ${val}問 (${pct}%)`;
            }
          }
        }
      }
    }
  });
}
