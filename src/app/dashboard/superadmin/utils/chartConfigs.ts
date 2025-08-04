export const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        color: 'rgba(255, 255, 255, 0.8)',
      },
    },
  },
  scales: {
    x: {
      ticks: {
        color: 'rgba(255, 255, 255, 0.7)',
      },
      grid: {
        color: 'rgba(255, 255, 255, 0.1)',
      },
    },
    y: {
      ticks: {
        color: 'rgba(255, 255, 255, 0.7)',
      },
      grid: {
        color: 'rgba(255, 255, 255, 0.1)',
      },
    },
  },
};

export const stackedBarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        color: 'rgba(255, 255, 255, 0.8)',
      },
    },
    title: {
      display: true,
      text: 'Lead Distribution by Source and Status',
      color: 'rgba(255, 255, 255, 0.8)',
    },
  },
  scales: {
    x: {
      stacked: true,
      ticks: {
        color: 'rgba(255, 255, 255, 0.7)',
      },
      grid: {
        color: 'rgba(255, 255, 255, 0.1)',
      },
    },
    y: {
      stacked: true,
      ticks: {
        color: 'rgba(255, 255, 255, 0.7)',
      },
      grid: {
        color: 'rgba(255, 255, 255, 0.1)',
      },
    },
  },
};

export const pieOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right' as const,
      labels: {
        color: 'rgba(255, 255, 255, 0.8)',
      },
    },
  },
};

export const sourceTotalsPieOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        color: 'rgba(255, 255, 255, 0.8)',
        padding: 15,
        font: {
          size: 12
        }
      },
    },
    title: {
      display: true,
      text: 'Total Leads by Source',
      color: 'rgba(255, 255, 255, 0.9)',
      font: {
        size: 16
      },
      padding: {
        top: 10,
        bottom: 20
      }
    },
  },
};

export const horizontalBarOptions = {
  indexAxis: 'y' as const,
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top' as const,
      labels: {
        color: 'rgba(255, 255, 255, 0.8)',
      },
    },
    title: {
      display: true,
      text: 'Conversion Performance by Source',
      color: 'rgba(255, 255, 255, 0.9)',
      font: {
        size: 16
      },
      padding: {
        top: 10,
        bottom: 15
      }
    },
    tooltip: {
      callbacks: {
        footer: (tooltipItems: any) => {
          const sourceIndex = tooltipItems[0].dataIndex;
          // This will need to be passed as a prop or context
          return `Conversion Rate: 0%`;
        }
      }
    }
  },
  scales: {
    x: {
      stacked: true,
      grid: {
        color: 'rgba(255, 255, 255, 0.1)',
      },
      ticks: {
        color: 'rgba(255, 255, 255, 0.7)',
      }
    },
    y: {
      stacked: true,
      grid: {
        display: false,
      },
      ticks: {
        color: 'rgba(255, 255, 255, 0.7)',
      }
    }
  },
};

export const statusColors = [
  'rgba(52, 191, 163, 0.8)',
  'rgba(235, 87, 87, 0.8)',
  'rgba(249, 178, 51, 0.8)',
  'rgba(98, 114, 164, 0.8)',
  'rgba(30, 215, 96, 0.8)',
  'rgba(138, 43, 226, 0.8)',
  'rgba(255, 159, 64, 0.8)',
  'rgba(201, 203, 207, 0.8)',
  'rgba(128, 128, 128, 0.8)',
];

export const sourceColors = {
  settleloans: 'rgba(52, 191, 163, 0.8)',  // Teal
  credsettlee: 'rgba(79, 70, 229, 0.8)',   // Indigo
  ama: 'rgba(249, 115, 22, 0.8)',          // Orange
  billcut: 'rgba(236, 72, 153, 0.8)',      // Pink
}; 