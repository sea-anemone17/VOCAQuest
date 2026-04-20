export const scenarios = [
  {
    id: 'night-archive',
    title: '야간 문서실',
    intro: '봉인된 문서실에서 단서를 모아 기록을 복원합니다. 단서를 하나 해석할 때마다 다음 문으로 이동합니다.',
    scenes: [
      {
        title: '입구',
        text: '먼지 낀 카드 서랍이 잠겨 있습니다. 첫 단어를 해석해 자물쇠를 풉니다.',
        actionLabel: '서랍을 조사한다'
      },
      {
        title: '중앙 서가',
        text: '찢긴 보고서 조각이 바닥에 흩어져 있습니다. 해석이 맞으면 기록이 이어집니다.',
        actionLabel: '기록 조각을 맞춘다'
      },
      {
        title: '마지막 봉인',
        text: '마지막 장치가 열리면 사건의 결말이 드러납니다.',
        actionLabel: '봉인을 해독한다'
      }
    ]
  },
  {
    id: 'signal-trace',
    title: '신호 추적',
    intro: '사라진 신호를 따라가며 단어를 해석해 좌표를 복원합니다.',
    scenes: [
      {
        title: '끊긴 파형',
        text: '왜곡된 신호에 첫 좌표가 숨어 있습니다.',
        actionLabel: '파형을 분석한다'
      },
      {
        title: '반사 구간',
        text: '의미를 틀리면 잘못된 좌표로 빠질 수 있습니다.',
        actionLabel: '좌표를 보정한다'
      },
      {
        title: '종착점',
        text: '마지막 단서를 잡으면 경로가 완성됩니다.',
        actionLabel: '신호를 고정한다'
      }
    ]
  }
];
