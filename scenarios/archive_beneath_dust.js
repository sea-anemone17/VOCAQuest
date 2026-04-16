export const archiveBeneathDustScenario = {
  id: "archive_beneath_dust",
  title: "먼지 아래 기록",
  intro:
    "당신은 오래된 문서 보관소의 지하 열람실로 내려간다. 목록에서 사라진 문서가 한 점 있다는 제보가 있었다. 서가는 여전히 가득 차 있지만, 무언가는 분명히 빠져 있다.",

  loopConfig: {
    maxTurns: 8,
    clueGoal: 5,
    mistakeLimit: 4,
    minActionsBeforeEnding: 3
  },

  endingTexts: {
    high:
      "당신은 사라진 문서의 윤곽을 거의 완전히 복원해 냈다. 무엇이 지워졌는지, 누가 그것을 원했는지, 왜 하필 이 기록이어야 했는지—그 세 질문에 대한 답이 이제 어느 정도 손에 잡힌다.",
    mid:
      "당신은 기록의 일부를 복원했지만, 핵심적인 공백은 여전히 남아 있다. 누군가의 의도는 분명했지만, 그 전말을 온전히 밝혀 내기엔 남겨진 단서가 충분하지 않았다.",
    low:
      "당신은 문서가 사라졌다는 사실만 확인하고 열람실을 나선다. 서가는 여전히 가득 차 있고, 빠진 자리는 다른 책들에 의해 이미 메워져 있다."
  },

  routeSummaries: {
    survey:
      "당신은 서가의 배치와 분류 체계, 먼지의 두께 같은 공간 전체의 인상에서 단서를 읽어 내려 했다.",
    reconstruct:
      "당신은 남겨진 문서들의 순서와 흔적을 토대로 사라진 것이 무엇이었는지 역으로 추적하려 했다.",
    interpret:
      "당신은 남아 있는 문서의 내용과 주석, 여백의 메모를 분석하며 기록이 감추고 있는 의미를 해석하려 했다."
  },

  actionTypes: [
    {
      id: "survey",
      label: "서가를 조사한다",

      descriptionPool: [
        "서가의 분류 방식, 라벨의 훼손 정도, 책 사이의 간격 같은 것을 천천히 살핀다.",
        "당신은 공간 전체를 하나의 문서처럼 읽으려 한다. 배치 자체가 무언가를 말하고 있을지도 모른다.",
        "먼지의 분포, 서가의 기울기, 손이 닿은 흔적의 위치를 훑으며 이 방이 어떻게 사용되었는지 감지하려 한다."
      ],

      preferredTags: ["place", "document", "time", "object"],
      preferredPos: ["noun", "adjective"],

      successTextPool: [
        "당신은 서가 하나가 다른 것들과 미묘하게 다르게 배치되어 있다는 사실을 알아차린다. 분류 번호는 연속되지만, 그 사이 어딘가에 원래 있었어야 할 것이 없다.",
        "당신은 먼지의 두께가 균일하지 않다는 점에 주목한다. 누군가가 최근에 이 서가를 건드렸고, 그 흔적은 아직 지워지지 않았다.",
        "당신은 라벨이 교체된 칸을 발견한다. 원래의 분류 기호가 희미하게 남아 있고, 새 라벨은 그것을 덮으려 했지만 완전히 성공하지 못했다."
      ],

      failureTextPool: [
        "당신은 서가를 훑었지만 특별한 이상을 발견하지 못한다. 모든 것이 제자리에 있는 것처럼 보인다.",
        "당신은 분류 체계를 따라가려 했지만, 너무 방대하고 복잡해서 어디서부터 시작해야 할지 갈피를 잡지 못한다.",
        "당신은 서가를 살폈지만 주목할 만한 것을 찾지 못한다. 먼지와 오래된 종이 냄새 외에는 아무것도 없다."
      ],

      successJournalPool: [
        "당신은 서가의 배치에서 의도적으로 만들어진 공백을 감지했다.",
        "당신은 먼지의 분포가 이 방의 최근 사용 패턴을 반영한다는 사실을 알아차렸다.",
        "당신은 라벨이 교체된 흔적에서 누군가의 개입을 읽어 냈다.",
        "당신은 분류 번호의 흐름에서 사라진 것이 있었던 자리를 좁혀 냈다."
      ],

      failureJournalPool: [
        "당신은 서가를 훑었지만 이상한 점을 발견하지 못했다.",
        "당신은 분류 체계의 복잡함에 압도되어 단서를 놓쳤다.",
        "당신은 공간을 살폈지만 표면 이상의 것을 읽어내지 못했다.",
        "당신은 무언가 어긋난 느낌을 받았지만 그것을 구체적으로 포착하지는 못했다."
      ],

      choicePool: [
        {
          id: "survey_label",
          label: "라벨의 훼손 상태를 확인한다",
          journalText: "당신은 라벨의 잉크 상태와 교체 여부를 꼼꼼히 살폈다.",
          routeTag: "careful"
        },
        {
          id: "survey_gap",
          label: "서가 사이의 간격을 측정해 본다",
          journalText: "당신은 책 사이의 간격이 일정하지 않은 칸을 표시해 두었다.",
          routeTag: "systematic"
        },
        {
          id: "survey_dust",
          label: "먼지가 덜 쌓인 구역을 찾는다",
          journalText: "당신은 손이 최근에 닿았을 법한 부분을 찾아 먼지의 두께를 비교했다.",
          routeTag: "tracking"
        },
        {
          id: "survey_number",
          label: "분류 번호의 연속성을 따라간다",
          journalText: "당신은 분류 번호의 흐름이 끊기는 지점을 찾아 표시했다.",
          routeTag: "systematic"
        },
        {
          id: "survey_overview",
          label: "한 걸음 물러서 전체 배치를 본다",
          journalText: "당신은 서가 전체를 조망하며 전체적인 구조적 이상을 감지하려 했다.",
          routeTag: "careful"
        }
      ],

      effects: {
        success: { clue: 1, routeBias: "survey" },
        failure: { mistake: 1, routeBias: "survey" }
      }
    },

    {
      id: "reconstruct",
      label: "흔적을 복원한다",

      descriptionPool: [
        "사라진 문서 주변에 남은 것들을 통해 그것이 무엇이었는지를 역으로 추적한다.",
        "남겨진 문서들의 순서, 참조 표시, 색인 항목을 조합해 비어 있는 자리를 채우려 한다.",
        "당신은 없는 것을 있는 것들로 증명하려 한다. 사라진 문서의 흔적은 남아 있는 문서들 속에 반드시 있을 것이다."
      ],

      preferredTags: ["action", "change", "relation", "authority"],
      preferredPos: ["verb", "noun"],

      successTextPool: [
        "당신은 인접한 문서들의 참조 표시에서 사라진 문서의 제목과 분류 기호를 거의 완전히 복원한다. 그것은 특정 시기의 결정과 관련된 내부 기록이었다.",
        "당신은 색인 카드에서 지워진 항목의 흔적을 발견한다. 지워졌지만 완전히 사라지지는 않았고, 그 아래 눌린 자국이 원래의 내용을 어렴풋이 드러낸다.",
        "당신은 문서 번호의 공백을 따라가다가 해당 번호가 다른 문서에서 두 번 인용되었다는 사실을 찾아낸다. 사라진 문서는 중요한 결정의 근거가 되었던 것이다."
      ],

      failureTextPool: [
        "당신은 남겨진 문서들을 뒤졌지만, 사라진 것과의 연결 고리를 찾아내지 못한다. 흔적은 있지만 연결되지 않는다.",
        "당신은 색인을 따라가다가 막힌다. 참조 표시가 순환되거나 끊겨 있어서 역추적이 어렵다.",
        "당신은 복원을 시도했지만, 남겨진 것들이 너무 단편적이어서 사라진 문서의 윤곽을 그리지 못한다."
      ],

      successJournalPool: [
        "당신은 인접 문서의 참조 표시에서 사라진 문서의 제목을 복원해 냈다.",
        "당신은 지워진 색인 항목의 눌린 자국에서 원래 내용의 일부를 읽어 냈다.",
        "당신은 문서 번호의 공백이 의도적으로 만들어졌다는 사실을 확인했다.",
        "당신은 사라진 문서가 다른 기록들에 두 번 이상 인용되었다는 사실을 발견했다."
      ],

      failureJournalPool: [
        "당신은 흔적을 따라가다가 연결 고리를 놓쳤다.",
        "당신은 참조 표시의 흐름이 끊기는 지점에서 더 이상 나아가지 못했다.",
        "당신은 복원을 시도했지만 단편적인 정보를 하나로 묶어내지 못했다.",
        "당신은 사라진 것의 자리를 찾았지만 그것이 무엇이었는지는 알아내지 못했다."
      ],

      choicePool: [
        {
          id: "reconstruct_index",
          label: "색인 카드의 지워진 항목을 확인한다",
          journalText: "당신은 색인 카드에서 지워진 흔적을 조심스럽게 더듬었다.",
          routeTag: "forensic"
        },
        {
          id: "reconstruct_reference",
          label: "인접 문서의 참조 표시를 따라간다",
          journalText: "당신은 사라진 문서를 인용한 다른 기록들을 찾아 대조했다.",
          routeTag: "systematic"
        },
        {
          id: "reconstruct_number",
          label: "문서 번호의 공백을 역으로 추적한다",
          journalText: "당신은 번호 체계에서 건너뛰어진 구간을 찾아 표시했다.",
          routeTag: "systematic"
        },
        {
          id: "reconstruct_binding",
          label: "제본 흔적으로 원래 두께를 가늠한다",
          journalText: "당신은 남아 있는 제본 흔적으로 사라진 분량을 어림잡아 보았다.",
          routeTag: "forensic"
        },
        {
          id: "reconstruct_adjacent",
          label: "옆 자리 문서에 남은 압흔을 확인한다",
          journalText: "당신은 인접한 문서 표지에 눌린 자국이 사라진 것의 일부를 담고 있는지 살폈다.",
          routeTag: "forensic"
        }
      ],

      effects: {
        success: { clue: 1, routeBias: "reconstruct" },
        failure: { mistake: 1, routeBias: "reconstruct" }
      }
    },

    {
      id: "interpret",
      label: "내용을 해석한다",

      descriptionPool: [
        "남아 있는 문서의 본문, 주석, 여백의 메모를 읽으며 사라진 기록이 어떤 맥락에 있었는지 파악하려 한다.",
        "당신은 텍스트의 표면이 아니라 그 사이에 숨은 의미를 읽으려 한다. 무엇을 말하는지보다 무엇을 말하지 않는지가 더 중요할 수 있다.",
        "남은 문서들의 논리와 흐름을 따라가며, 사라진 기록이 어떤 결론을 향하고 있었는지 재구성하려 한다."
      ],

      preferredTags: ["concept", "authority", "document", "time"],
      preferredPos: ["noun", "adjective"],

      successTextPool: [
        "당신은 여백에 남겨진 메모에서 누군가의 동의와 반대 의견을 동시에 읽어 낸다. 사라진 문서는 단순한 기록이 아니라 논쟁의 중심에 있었다.",
        "당신은 인접 문서에서 삭제된 단락의 흔적을 발견한다. 지워진 내용은 특정 인물의 결정에 의문을 제기하는 것이었다.",
        "당신은 문서들 사이의 논리적 공백을 메우며 사라진 기록이 어떤 주장을 담고 있었는지 재구성한다. 그것은 이 보관소의 설립 이유와 직접 연결되어 있었다."
      ],

      failureTextPool: [
        "당신은 남은 문서들을 읽었지만, 사라진 것과의 연결 고리를 내용 안에서 찾아내지 못한다.",
        "당신은 여백의 메모를 해석하려 했지만, 문맥이 부족해서 그것이 무엇을 의미하는지 알 수 없다.",
        "당신은 텍스트의 논리를 따라갔지만, 어디에서 공백이 생기는지 감지하지 못한다."
      ],

      successJournalPool: [
        "당신은 여백의 메모에서 사라진 기록이 논쟁의 대상이었다는 사실을 읽어 냈다.",
        "당신은 삭제된 단락의 흔적에서 누군가의 개입을 확인했다.",
        "당신은 문서들 사이의 논리적 흐름에서 공백이 의도적으로 만들어졌다는 점을 감지했다.",
        "당신은 사라진 기록이 이 보관소의 역사와 직접 연결되어 있다는 사실을 알아차렸다."
      ],

      failureJournalPool: [
        "당신은 남은 텍스트를 읽었지만 사라진 것의 내용을 짐작하지 못했다.",
        "당신은 여백의 메모를 보았지만 그것이 무엇을 가리키는지 알 수 없었다.",
        "당신은 논리의 흐름을 따라갔지만 공백이 어디에 있는지 감지하지 못했다.",
        "당신은 텍스트 표면만 읽었고 그 사이에 숨은 의미까지는 닿지 못했다."
      ],

      choicePool: [
        {
          id: "interpret_margin",
          label: "여백의 손글씨 메모를 읽는다",
          journalText: "당신은 문서 여백에 남겨진 손글씨 메모를 오래 들여다보았다.",
          routeTag: "interpretive"
        },
        {
          id: "interpret_deleted",
          label: "삭제된 단락의 흔적을 찾는다",
          journalText: "당신은 지워졌거나 검게 칠해진 부분에서 원래 내용을 짐작하려 했다.",
          routeTag: "forensic"
        },
        {
          id: "interpret_logic",
          label: "문서의 논리적 흐름이 끊기는 지점을 찾는다",
          journalText: "당신은 문장의 흐름이 자연스럽지 않은 부분을 표시하며 읽어 나갔다.",
          routeTag: "interpretive"
        },
        {
          id: "interpret_date",
          label: "날짜와 서명의 패턴을 비교한다",
          journalText: "당신은 날짜와 서명이 일관되지 않는 지점에 주목했다.",
          routeTag: "systematic"
        },
        {
          id: "interpret_crossref",
          label: "다른 문서에서 같은 주제를 찾는다",
          journalText: "당신은 같은 사건이나 인물을 다른 각도에서 다루는 문서를 찾아 대조했다.",
          routeTag: "systematic"
        }
      ],

      effects: {
        success: { clue: 2, routeBias: "interpret" },
        failure: { mistake: 1, routeBias: "interpret" }
      }
    }
  ]
};
