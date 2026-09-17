<template>
    <SolicitarOrientacao
        @modal:open="recarregarAposSolicitar($event)"
        :professor="professorSelecionado._id"
        :emailProfessor="professorSelecionado.email"
        :nomeAluno="props?.usuario?.nome"
        :aluno="props?.usuario?.id"
        v-if="openSolicitarOrientacao"
    />
    <Videochamada
        v-if="openVideochamadaDefesa"
        :orientacao-id="orientacaoDefesaSelecionada"
        :usuario="props?.usuario"
        :eh-professor="props?.usuario?.tipo === 'professor'"
        @modal:open="openVideochamadaDefesa = $event"
    />
    <main class="flex-grow relative">
        <div class="home-shell mx-auto max-w-7xl p-[14px]">
            <aside class="home-rail bg-principal-opaco text-white rounded-md p-[20px] flex flex-col gap-[26px]">
                <div>
                    <Texto as="h4" color="white">{{ saudacao }}, {{ props?.usuario?.nome }}</Texto>
                    <p class="text-[13px] text-white/70 mt-[2px]">{{ subtitulo }}</p>
                </div>

                <div v-if="props?.usuario?.tipo === 'professor'" class="flex flex-col gap-[8px]">
                    <span class="text-[10.5px] font-bold uppercase tracking-wide text-white/50">Buscar aluno</span>
                    <input
                        v-model="busca"
                        type="text"
                        placeholder="Nome do aluno..."
                        class="text-[12px] bg-white/10 border border-white/15 rounded-md px-[10px] py-[7px] text-white placeholder-white/40 focus:outline-none focus:border-terciaria"
                    />
                </div>

                <div v-else-if="props?.usuario?.tipo === 'aluno'" class="flex flex-col gap-[6px]">
                    <input
                        v-model="busca"
                        type="text"
                        placeholder="Buscar professor..."
                        class="text-[11.5px] bg-white/10 border border-white/15 rounded-md px-[9px] py-[6px] text-white placeholder-white/40 focus:outline-none focus:border-terciaria"
                    />
                    <select
                        v-if="areasDisponiveis.length > 0"
                        v-model="areaSelecionada"
                        class="text-[11.5px] bg-white/10 border border-white/15 rounded-md px-[9px] py-[6px] text-white focus:outline-none focus:border-terciaria"
                    >
                        <option value="" class="text-black">Todas as áreas</option>
                        <option v-for="area in areasDisponiveis" :key="area" :value="area" class="text-black">{{ area }}</option>
                    </select>
                </div>

                <div v-if="props?.usuario?.tipo === 'professor'" class="flex flex-col gap-[14px]">
                    <div class="grid grid-cols-3 gap-[8px]">
                        <button
                            type="button"
                            :class="[
                                'text-left cursor-pointer bg-white/5 border rounded-md p-[10px] flex flex-col justify-between transition-colors hover:bg-white/10',
                                filtroStatus === 'em-dia' ? 'border-terciaria ring-1 ring-terciaria' : 'border-white/10',
                            ]"
                            @click="toggleFiltroStatus('em-dia')"
                        >
                            <div class="text-[20px] font-bold leading-none">{{ alunosNoPrazo }}</div>
                            <div class="text-[10px] text-white/60 mt-[4px]">em dia</div>
                        </button>
                        <button
                            type="button"
                            :class="[
                                'text-left cursor-pointer border rounded-md p-[10px] flex flex-col justify-between transition-colors',
                                alunosAtrasados.length > 0 ? 'bg-red-500/15 hover:bg-red-500/25' : 'bg-white/5 hover:bg-white/10',
                                filtroStatus === 'atrasado' ? 'border-terciaria ring-1 ring-terciaria' : (alunosAtrasados.length > 0 ? 'border-red-400/40' : 'border-white/10'),
                            ]"
                            @click="toggleFiltroStatus('atrasado')"
                        >
                            <div class="text-[20px] font-bold leading-none" :class="alunosAtrasados.length > 0 ? 'text-red-300' : ''">{{ alunosAtrasados.length }}</div>
                            <div class="text-[10px] text-white/60 mt-[4px]">atrasados</div>
                        </button>
                        <button
                            type="button"
                            :class="[
                                'text-left cursor-pointer bg-white/5 border rounded-md p-[10px] flex flex-col justify-between transition-colors hover:bg-white/10',
                                filtroHistorico === 'concluido' ? 'border-terciaria ring-1 ring-terciaria' : 'border-white/10',
                            ]"
                            @click="toggleFiltroHistorico('concluido')"
                        >
                            <div class="text-[20px] font-bold leading-none">{{ concluidas }}</div>
                            <div class="text-[10px] text-white/60 mt-[4px]">concluídas</div>
                        </button>
                    </div>

                    <div v-if="alunosOrientadosBase.length > 0" class="flex flex-col gap-[7px]">
                        <span class="text-[10.5px] font-bold uppercase tracking-wide text-white/50">Distribuição por fase</span>
                        <div v-for="f in distribuicaoFases" :key="f.nome" class="flex items-center gap-[8px]">
                            <span class="text-[11px] text-white/70 w-[82px] flex-shrink-0 truncate">{{ f.nome }}</span>
                            <div class="flex-1 h-[6px] bg-white/10 rounded-full overflow-hidden">
                                <div class="h-full bg-terciaria rounded-full" :style="{ width: `${(f.total / maiorFase) * 100}%` }"></div>
                            </div>
                            <span class="text-[11px] text-white/60 w-[14px] text-right flex-shrink-0 tabular-nums">{{ f.total }}</span>
                        </div>
                    </div>

                    <div v-if="proximaDefesa" class="flex flex-col gap-[6px]">
                        <span class="text-[10.5px] font-bold uppercase tracking-wide text-white/50">Próxima defesa</span>
                        <router-link
                            :to="`/ui/acompanhamento/${proximaDefesa._id}`"
                            class="bg-white/5 hover:bg-white/10 border border-white/10 rounded-md p-[10px] flex flex-col gap-[4px] transition-colors"
                        >
                            <span class="text-[13px] font-bold">{{ proximaDefesa.aluno?.nome }} {{ proximaDefesa.aluno?.sobrenome }}</span>
                            <span class="flex items-center gap-[6px] text-[12px] text-white/70">
                                <PhCalendarBlank :size="13" class="flex-shrink-0" />
                                {{ formatMask.viewDate(proximaDefesa.dataDefesa) }}{{ proximaDefesa.horaDefesa ? ` às ${proximaDefesa.horaDefesa}` : '' }}
                            </span>
                        </router-link>
                    </div>

                    <div v-if="alunosAtrasados.length > 0" class="flex flex-col gap-[6px]">
                        <span class="text-[10.5px] font-bold uppercase tracking-wide text-white/50">Precisam de atenção</span>
                        <router-link
                            v-for="aluno in alunosAtrasados.slice(0, 4)"
                            :key="aluno.orientacaoId"
                            :to="`/ui/acompanhamento/${aluno.orientacaoId}`"
                            class="flex items-center gap-[8px] text-[12px] text-white/85 hover:text-white bg-white/5 hover:bg-white/10 rounded-md px-[8px] py-[6px] transition-colors"
                        >
                            <PhWarning :size="14" class="fill-red-400 flex-shrink-0" />
                            <span class="truncate">{{ aluno.nome }} {{ aluno.sobrenome }}</span>
                        </router-link>
                        <span v-if="alunosAtrasados.length > 4" class="text-[11px] text-white/50 pl-[8px]">
                            +{{ alunosAtrasados.length - 4 }} outro{{ alunosAtrasados.length - 4 === 1 ? '' : 's' }}
                        </span>
                    </div>
                </div>

                <div v-else-if="props?.usuario?.tipo === 'aluno'" class="flex flex-col gap-[14px]">
                    <div class="grid grid-cols-3 gap-[6px]">
                        <button
                            type="button"
                            :class="[
                                'text-left cursor-pointer bg-white/5 border rounded-md p-[10px] flex flex-col justify-between transition-colors hover:bg-white/10',
                                filtroHistorico === 'todas' ? 'border-terciaria ring-1 ring-terciaria' : 'border-white/10',
                            ]"
                            @click="toggleFiltroHistorico('todas')"
                        >
                            <div class="text-[20px] font-bold leading-none">{{ totalSolicitacoes }}</div>
                            <div class="text-[10px] text-white/60 mt-[4px]">solicitações</div>
                        </button>
                        <button
                            type="button"
                            :class="[
                                'text-left cursor-pointer bg-white/5 border rounded-md p-[10px] flex flex-col justify-between transition-colors hover:bg-white/10',
                                filtroHistorico === 'confirmado' ? 'border-terciaria ring-1 ring-terciaria' : 'border-white/10',
                            ]"
                            @click="toggleFiltroHistorico('confirmado')"
                        >
                            <div class="text-[20px] font-bold leading-none">{{ minhasEmAndamento }}</div>
                            <div class="text-[10px] text-white/60 mt-[4px]">em andamento</div>
                        </button>
                        <button
                            type="button"
                            :class="[
                                'text-left cursor-pointer bg-white/5 border rounded-md p-[10px] flex flex-col justify-between transition-colors hover:bg-white/10',
                                filtroHistorico === 'concluido' ? 'border-terciaria ring-1 ring-terciaria' : 'border-white/10',
                            ]"
                            @click="toggleFiltroHistorico('concluido')"
                        >
                            <div class="text-[20px] font-bold leading-none">{{ concluidas }}</div>
                            <div class="text-[10px] text-white/60 mt-[4px]">concluída{{ concluidas === 1 ? '' : 's' }}</div>
                        </button>
                    </div>

                    <div v-if="minhaOrientacao" class="flex flex-col gap-[8px]">
                        <span class="text-[10.5px] font-bold uppercase tracking-wide text-white/50">Sua orientação</span>
                        <div class="bg-white/5 border border-white/10 rounded-md p-[10px] flex flex-col gap-[6px]">
                            <div class="text-[13px] font-bold">{{ minhaOrientacao.professor?.nome }} {{ minhaOrientacao.professor?.sobrenome }}</div>
                            <div class="flex items-center gap-[6px] text-[12px] text-white/70">
                                <PhClock :size="13" class="flex-shrink-0" />
                                {{ minhaFaseAtual ? `Fase atual: ${minhaFaseAtual.nome}` : 'Todas as fases aprovadas' }}
                            </div>
                            <div v-if="minhaOrientacaoAtrasada" class="flex items-center gap-[6px] text-[12px] text-red-300 font-bold">
                                <PhWarning :size="13" class="fill-red-300 flex-shrink-0" />
                                Prazo da fase atual vencido
                            </div>
                            <div v-if="minhaOrientacao.dataDefesa" class="flex items-center gap-[6px] text-[12px] text-white/70">
                                <PhGraduationCap :size="13" class="flex-shrink-0" />
                                Defesa em {{ formatMask.viewDate(minhaOrientacao.dataDefesa) }}
                                <template v-if="diasParaDefesa !== null">
                                    · {{ diasParaDefesa > 0 ? `faltam ${diasParaDefesa} dia${diasParaDefesa === 1 ? '' : 's'}` : 'é hoje!' }}
                                </template>
                            </div>
                            <button
                                v-if="minhaOrientacao.dataDefesa"
                                type="button"
                                class="cursor-pointer flex items-center justify-center gap-[6px] bg-terciaria hover:bg-terciaria-opaco text-white rounded-md px-[10px] py-[7px] font-bold text-[12px] mt-[2px]"
                                @click="abrirSalaDefesa(minhaOrientacao)"
                            >
                                <PhVideoCamera :size="14" />
                                Entrar na sala
                            </button>
                            <router-link
                                :to="`/ui/acompanhamento/${minhaOrientacao._id}`"
                                class="text-[11px] font-bold text-terciaria hover:underline mt-[2px]"
                            >
                                Ver acompanhamento →
                            </router-link>
                        </div>
                    </div>

                    <div class="flex flex-col gap-[9px]">
                        <span class="text-[10.5px] font-bold uppercase tracking-wide text-white/50">Disponibilidade</span>
                        <div class="flex items-center gap-[8px] text-[12px] text-white/80">
                            <span class="w-[8px] h-[8px] rounded-full bg-green-500 flex-shrink-0"></span>
                            Integral — aceitando novas orientações
                        </div>
                        <div class="flex items-center gap-[8px] text-[12px] text-white/80">
                            <span class="w-[8px] h-[8px] rounded-full bg-terciaria flex-shrink-0"></span>
                            Parcial — vagas limitadas
                        </div>
                        <div class="flex items-center gap-[8px] text-[12px] text-white/80">
                            <span class="w-[8px] h-[8px] rounded-full bg-white/30 flex-shrink-0"></span>
                            Indisponível no momento
                        </div>
                    </div>
                </div>

                <div class="home-rail-foot mt-auto pt-[16px] border-t border-white/10 text-[11px] text-white/40">
                    Trabalho de Conclusão de Curso · Engenharia de Computação
                </div>
            </aside>

            <div class="home-main flex flex-col gap-[24px]">
                <ListaOrientacao
                    v-if="!(props?.usuario?.tipo === 'professor' && filtroStatus)"
                    ref="listaOrientacaoRef"
                    :usuario="props?.usuario"
                    :filtro-externo="filtroHistorico"
                    @atualizado="listarOrientacao"
                    @historico="verHistorico = $event"
                    @filtro-manual="filtroHistorico = null; filtroStatus = null"
                ></ListaOrientacao>

                <section v-if="props?.usuario?.tipo === 'professor' && orientacoesComDefesa.length > 0" class="grid grid-cols-1 gap-[10px] border border-secundaria-opaco rounded-md bg-white p-[14px]">
                    <div class="flex items-center gap-[8px] border-b border-secundaria-opaco pb-[8px]">
                        <PhCalendarBlank :size="22" class="fill-principal" />
                        <Texto as="h4" color="principal">Defesas marcadas</Texto>
                        <span class="text-[11px] font-bold px-[8px] py-[2px] rounded-full bg-secundaria-opaco text-principal">
                            {{ orientacoesComDefesa.length }}
                        </span>
                    </div>
                    <div class="flex gap-[12px] overflow-x-auto pb-[6px]">
                        <div
                            v-for="o in orientacoesComDefesa"
                            :key="o._id"
                            class="relative flex-shrink-0 w-[250px] flex flex-col gap-[8px] bg-white border border-secundaria-opaco rounded-md p-[12px] shadow-sm hover:shadow-md transition-shadow"
                        >
                            <span :class="`absolute left-0 top-[10px] bottom-[10px] w-[3px] rounded-r-[3px] ${ehHojeData(o.dataDefesa) ? 'bg-terciaria' : 'bg-secundaria-opaco'}`"></span>
                            <div class="pl-[8px]">
                                <Texto as="label" class="truncate font-bold">{{ o.aluno?.nome }} {{ o.aluno?.sobrenome }}</Texto>
                                <Texto as="small" color="gray" class="normal-case font-normal line-clamp-1">
                                    {{ o.tema || 'Tema não definido' }}
                                </Texto>
                            </div>
                            <div class="flex items-center gap-[6px] pl-[8px] text-[12px] text-gray-600">
                                <PhClock :size="14" class="flex-shrink-0" />
                                {{ formatMask.viewDate(o.dataDefesa) }}{{ o.horaDefesa ? ` às ${o.horaDefesa}` : '' }}
                            </div>
                            <div class="flex items-center gap-[6px] pl-[8px] mt-auto pt-[2px]">
                                <button
                                    type="button"
                                    class="cursor-pointer flex items-center gap-[4px] px-[10px] py-[6px] bg-terciaria text-white hover:bg-terciaria-opaco rounded-md font-bold text-[12px]"
                                    @click="abrirSalaDefesa(o)"
                                >
                                    <PhVideoCamera :size="14" />
                                    Entrar na sala
                                </button>
                                <router-link
                                    :to="`/ui/acompanhamento/${o._id}`"
                                    class="cursor-pointer flex items-center gap-[4px] px-[10px] py-[6px] border border-principal text-principal hover:bg-secundaria rounded-md font-bold text-[12px]"
                                >
                                    <PhInfo :size="14" />
                                    Detalhes
                                </router-link>
                            </div>
                        </div>
                    </div>
                </section>

                <section
                    v-if="!verHistorico && props?.usuario?.tipo === 'professor'"
                    :class="['grid grid-cols-1 gap-[10px] border border-secundaria-opaco rounded-md bg-white p-[14px]', filtroStatus ? 'order-first' : '']"
                >
                    <div class="flex items-center justify-between flex-wrap gap-[8px] border-b border-secundaria-opaco pb-[8px]">
                        <div class="flex items-center gap-[8px]">
                            <PhUsersThree :size="22" class="fill-principal" />
                            <Texto as="h4" color="principal">
                                Meus alunos
                                <template v-if="filtroStatus"> — {{ filtroStatus === 'em-dia' ? 'em dia' : 'atrasados' }}</template>
                            </Texto>
                            <span v-if="alunosOrientados.length > 0" class="text-[11px] font-bold px-[8px] py-[2px] rounded-full bg-secundaria-opaco text-principal">
                                {{ alunosOrientados.length }}
                            </span>
                        </div>
                        <button v-if="busca || filtroStatus" type="button" class="cursor-pointer text-[13px] font-bold text-principal hover:underline" @click="busca = ''; filtroStatus = null">
                            Limpar filtros
                        </button>
                    </div>

                    <div v-if="alunosOrientados.length === 0" class="flex flex-col items-center gap-[6px] py-[24px]">
                        <PhUsersThree :size="32" class="fill-secundaria-opaco" />
                        <Texto as="body" color="gray">
                            {{ busca || filtroStatus ? 'Nenhum aluno encontrado com esse filtro.' : 'Você ainda não está orientando nenhum aluno.' }}
                        </Texto>
                    </div>
                    <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[10px]">
                        <section
                            v-for="aluno in alunosOrientados"
                            :key="aluno.orientacaoId"
                            class="relative flex flex-col gap-[8px] border border-secundaria-opaco rounded-md p-[10px] bg-white hover:shadow-md hover:border-principal/40 transition-all"
                        >
                            <div class="flex items-center gap-[10px]">
                                <img
                                    v-if="aluno?.imagem?.filename"
                                    :src="`${urlApi}/uploads/${aluno.imagem.filename}`"
                                    :alt="aluno.imagem.originalname"
                                    class="h-[42px] w-[42px] object-cover rounded-full border-2 border-secundaria-opaco flex-shrink-0"
                                />
                                <img
                                    v-else
                                    :src="`/ui/Sem_imagem.jpg`"
                                    :alt="'sem imagem'"
                                    class="h-[42px] w-[42px] object-cover rounded-full border-2 border-secundaria-opaco flex-shrink-0"
                                />
                                <Texto as="label" class="truncate font-bold flex-1">
                                    {{ aluno.nome }} {{ aluno.sobrenome }}
                                </Texto>
                                <div class="relative flex-shrink-0" :title="aluno.notificacao ? 'Tem novidade' : 'Sem novidade'">
                                    <PhBell :size="18" :class="aluno.notificacao ? 'fill-red-500' : 'fill-gray-300'" />
                                    <span v-if="aluno.notificacao" class="absolute -top-[2px] -right-[2px] w-[7px] h-[7px] rounded-full bg-red-500 border border-white"></span>
                                </div>
                            </div>

                            <div class="border-l-2 border-secundaria-opaco pl-[8px]">
                                <Texto as="small" color="gray">
                                    Proposta{{ aluno.dataCriacao ? ` · orientando desde ${formatMask.viewDate(aluno.dataCriacao)}` : '' }}
                                </Texto>
                                <Texto as="label" class="line-clamp-2 italic">
                                    "{{ aluno.proposta?.trim() || 'Não informado' }}"
                                </Texto>
                            </div>

                            <router-link
                                v-if="aluno.cancelamento?.solicitadoPor && !aluno.cancelamento?.resposta?.data"
                                :to="`/ui/acompanhamento/${aluno.orientacaoId}`"
                                class="cursor-pointer border border-orange-300 bg-orange-50 hover:bg-orange-100 rounded-md p-[8px] flex items-center gap-[6px]"
                            >
                                <PhWarning :size="16" class="fill-orange-500 flex-shrink-0" />
                                <Texto as="label" color="orange" class="line-clamp-1" :cursorPointer="true">
                                    Cancelamento solicitado, veja em "Acompanhar".
                                </Texto>
                            </router-link>

                            <div class="flex flex-col gap-[4px] mt-auto pt-[4px]">
                                <router-link
                                    :to="`/ui/orientacao/${aluno.orientacaoId}`"
                                    class="cursor-pointer w-full flex items-center justify-center gap-[4px] px-[8px] py-[5px] border border-principal text-principal hover:bg-secundaria rounded-md font-bold text-[11px]"
                                >
                                    <PhInfo :size="13" />
                                    Detalhes da proposta
                                </router-link>
                                <router-link
                                    :to="`/ui/acompanhamento/${aluno.orientacaoId}`"
                                    class="cursor-pointer w-full flex items-center justify-center gap-[4px] px-[8px] py-[5px] bg-terciaria text-white hover:bg-terciaria-opaco rounded-md font-bold text-[11px]"
                                >
                                    <PhChartLineUp :size="13" />
                                    Acompanhar
                                </router-link>
                            </div>
                        </section>
                    </div>
                </section>

                <section v-else-if="!verHistorico" class="grid grid-cols-1 gap-[10px] border border-secundaria-opaco rounded-md bg-white p-[14px]">
                    <div class="flex items-center justify-between flex-wrap gap-[8px] border-b border-secundaria-opaco pb-[8px]">
                        <div class="flex items-center gap-[8px]">
                            <PhGraduationCap :size="22" class="fill-principal" />
                            <Texto as="h4" color="principal">Professores disponíveis</Texto>
                            <span v-if="professoresDisponiveis.length > 0" class="text-[11px] font-bold px-[8px] py-[2px] rounded-full bg-secundaria-opaco text-principal">
                                {{ professoresDisponiveis.length }}
                            </span>
                        </div>
                        <button
                            v-if="busca || areaSelecionada"
                            type="button"
                            class="cursor-pointer text-[13px] font-bold text-principal hover:underline"
                            @click="busca = ''; areaSelecionada = ''"
                        >
                            Limpar filtros
                        </button>
                    </div>

                    <div v-if="professoresDisponiveis.length === 0" class="flex flex-col items-center gap-[6px] py-[24px]">
                        <PhGraduationCap :size="32" class="fill-secundaria-opaco" />
                        <Texto as="body" color="gray">
                            {{ busca || areaSelecionada ? 'Nenhum professor encontrado com esses filtros.' : 'Nenhum professor disponível encontrado no momento.' }}
                        </Texto>
                    </div>
                    <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[10px]">
                        <section
                            v-for="professor in professoresDisponiveis"
                            :key="professor._id"
                            class="relative flex flex-col gap-[8px] border border-secundaria-opaco rounded-md p-[10px] bg-white hover:shadow-md hover:border-principal/40 transition-all"
                        >
                            <span
                                v-if="orientacaoDoProfessor(professor._id)?.situacao === 'confirmado'"
                                class="absolute top-[8px] right-[8px] text-[9px] font-bold px-[6px] py-[2px] rounded-full bg-terciaria text-white"
                            >
                                Seu orientador
                            </span>

                            <div class="flex items-center gap-[10px]">
                                <img
                                    v-if="professor?.imagem?.filename"
                                    :src="`${urlApi}/uploads/${professor?.imagem?.filename}`"
                                    :alt="professor?.imagem?.originalname"
                                    class="h-[42px] w-[42px] object-cover rounded-full border-2 border-secundaria-opaco flex-shrink-0"
                                />
                                <img
                                    v-else
                                    :src="`/ui/Sem_imagem.jpg`"
                                    :alt="'sem imagem'"
                                    class="h-[42px] w-[42px] object-cover rounded-full border-2 border-secundaria-opaco flex-shrink-0"
                                />
                                <div class="flex flex-col gap-[2px] min-w-0">
                                    <Texto as="label" class="truncate font-bold">
                                        {{ professor.nome }} {{ professor.sobrenome }}
                                    </Texto>
                                    <div class="flex items-center gap-[4px]">
                                        <span :class="`w-[7px] h-[7px] rounded-full flex-shrink-0 ${disponibilidadeCor(professor.disponibilidade)}`"></span>
                                        <Texto as="small" color="gray" class="normal-case font-normal">
                                            {{ professor.disponibilidade }}
                                        </Texto>
                                    </div>
                                </div>
                            </div>

                            <div class="flex flex-col gap-[6px] border-t border-secundaria pt-[6px]">
                                <div class="flex items-start gap-[6px]">
                                    <PhUsersThree :size="15" class="fill-gray-400 flex-shrink-0 mt-[2px]" />
                                    <Texto as="label" color="gray">
                                        {{ professor.totalOrientados > 0 ? `Já orientou ${professor.totalOrientados} aluno${professor.totalOrientados === 1 ? '' : 's'}` : 'Ainda não concluiu nenhuma orientação' }}
                                    </Texto>
                                </div>
                                <div class="flex items-start gap-[6px]">
                                    <PhChalkboardTeacher :size="15" class="fill-gray-400 flex-shrink-0 mt-[2px]" />
                                    <Texto as="label" class="line-clamp-2">
                                        {{ professor.formacao?.trim() || 'Formação não informada' }}
                                    </Texto>
                                </div>
                                <div class="flex items-start gap-[6px]" v-if="interesseTags(professor).length">
                                    <PhLightbulb :size="15" class="fill-gray-400 flex-shrink-0 mt-[2px]" />
                                    <div class="flex flex-wrap gap-[4px]">
                                        <span
                                            v-for="tag in interesseTags(professor)"
                                            :key="tag"
                                            class="text-[10px] font-bold px-[7px] py-[2px] rounded-full bg-secundaria-opaco text-principal"
                                        >
                                            {{ tag }}
                                        </span>
                                    </div>
                                </div>
                                <div class="flex items-start gap-[6px]" v-else>
                                    <PhLightbulb :size="15" class="fill-gray-400 flex-shrink-0 mt-[2px]" />
                                    <Texto as="label" color="gray">Áreas de interesse não informadas</Texto>
                                </div>
                            </div>

                            <div class="flex flex-col gap-[4px] mt-auto pt-[4px]">
                                <router-link
                                    :to="`/ui/professor/${professor._id}`"
                                    class="cursor-pointer w-full flex items-center justify-center gap-[4px] px-[8px] py-[5px] border border-principal text-principal hover:bg-secundaria rounded-md font-bold text-[11px]"
                                >
                                    <PhInfo :size="13" />
                                    Detalhes
                                </router-link>
                                <router-link
                                    v-if="props?.usuario?.tipo === 'aluno' && orientacaoDoProfessor(professor._id)?.situacao === 'confirmado'"
                                    :to="`/ui/acompanhamento/${orientacaoDoProfessor(professor._id)._id}`"
                                    class="cursor-pointer w-full flex items-center justify-center gap-[4px] px-[8px] py-[5px] bg-terciaria text-white hover:bg-terciaria-opaco rounded-md font-bold text-[11px]"
                                >
                                    <PhChartLineUp :size="13" />
                                    Acompanhar
                                </router-link>
                                <button
                                    v-else-if="props?.usuario?.tipo === 'aluno'"
                                    type="button"
                                    class="cursor-pointer w-full flex items-center justify-center gap-[4px] px-[8px] py-[5px] bg-principal text-white hover:bg-principal-opaco rounded-md font-bold text-[11px]"
                                    @click="iniciarSolicitacao(professor)"
                                >
                                    <PhRocketLaunch :size="13" />
                                    Solicitar orientação
                                </button>
                            </div>
                        </section>
                    </div>
                </section>
            </div>
        </div>
    </main>
</template>
<script setup>
import { PhInfo, PhRocketLaunch, PhChartLineUp, PhBell, PhWarning, PhUsersThree, PhGraduationCap, PhChalkboardTeacher, PhLightbulb, PhClock, PhCalendarBlank, PhVideoCamera } from '@phosphor-icons/vue';
import { computed, onMounted, onUnmounted, ref, reactive } from "vue";
import api from "@/api.js";
import { popupInfo, formatMask } from '../stores/util.js';
import Texto from '@components/Texto.vue'
import { useLoaderState } from "../stores/isLoading";
import ListaOrientacao from './Orientacao/ListaOrientacao.vue';
import SolicitarOrientacao from './Orientacao/SolicitarOrientacao.vue';
import Videochamada from './Orientacao/Videochamada.vue';
const isLoading = useLoaderState();

const professores = ref([])
const orientacoes = reactive([])
const historico = reactive([])
const urlApi = import.meta.env.VITE_URL;
const props = defineProps({
    usuario: {
        type: [Object],
        required: false,
    },
})

const openSolicitarOrientacao = ref(false);
const professorSelecionado = reactive({ _id: '', email: '' });

const openVideochamadaDefesa = ref(false);
const orientacaoDefesaSelecionada = ref('');

function abrirSalaDefesa(o) {
    orientacaoDefesaSelecionada.value = o._id;
    openVideochamadaDefesa.value = true;
}

function ehHojeData(data) {
    if (!data) return false;
    return formatMask.date(data) === formatMask.date(new Date());
}

const areaSelecionada = ref('');
const busca = ref('');
const filtroStatus = ref(null);
const filtroHistorico = ref(null);
const listaOrientacaoRef = ref(null);
const verHistorico = ref(false);

function toggleFiltroHistorico(valor) {
    filtroStatus.value = null;
    filtroHistorico.value = filtroHistorico.value === valor ? null : valor;
}

function toggleFiltroStatus(valor) {
    filtroHistorico.value = null;
    filtroStatus.value = filtroStatus.value === valor ? null : valor;
    verHistorico.value = false;
}

const saudacao = computed(() => {
    const hora = new Date().getHours();
    if (hora < 12) return 'Bom dia';
    if (hora < 18) return 'Boa tarde';
    return 'Boa noite';
});

const subtitulo = computed(() => {
    if (props?.usuario?.tipo === 'professor') {
        return alunosOrientadosBase.value.length > 0
            ? `Você está orientando ${alunosOrientadosBase.value.length} aluno${alunosOrientadosBase.value.length > 1 ? 's' : ''} no momento.`
            : 'Assim que um aluno for aceito, ele aparece aqui.';
    }
    return 'Acompanhe suas solicitações ou encontre um orientador ao lado.';
});

const areasDisponiveis = computed(() => {
    const areas = new Set();
    professores.value.forEach((p) => {
        (p.interesse || '').split(',').forEach((area) => {
            const nome = area.trim();
            if (nome) areas.add(nome);
        });
    });
    return [...areas].sort();
});

function interesseTags(professor) {
    return (professor.interesse || '').split(',').map((tag) => tag.trim()).filter(Boolean);
}

function disponibilidadeCor(disponibilidade) {
    const valor = (disponibilidade || '').toLowerCase();
    if (valor.includes('integral')) return 'bg-green-500';
    if (valor.includes('indispon')) return 'bg-gray-300';
    return 'bg-terciaria';
}

const professoresDisponiveis = computed(() =>
    professores.value
        .filter((p) => p.disponibilidade && p.disponibilidade !== 'indisponível')
        .filter((p) => {
            const orientacao = orientacaoDoProfessor(p._id);
            return !orientacao || orientacao.situacao === 'confirmado';
        })
        .filter((p) => {
            if (!areaSelecionada.value) return true;
            const interesse = (p.interesse || '').toLowerCase();
            return interesse.includes(areaSelecionada.value.toLowerCase());
        })
        .filter((p) => {
            const termo = busca.value.trim().toLowerCase();
            if (!termo) return true;
            const alvo = `${p.nome} ${p.sobrenome} ${p.interesse || ''} ${p.formacao || ''}`.toLowerCase();
            return alvo.includes(termo);
        })
);

const alunosOrientadosBase = computed(() => {
    return orientacoes
        .filter((o) => o.situacao === 'confirmado')
        .filter((o) => {
            const termo = busca.value.trim().toLowerCase();
            if (!termo) return true;
            const alvo = `${o.aluno?.nome} ${o.aluno?.sobrenome} ${o.proposta || ''}`.toLowerCase();
            return alvo.includes(termo);
        })
        .sort((a, b) => new Date(a.dataCriacao) - new Date(b.dataCriacao))
        .map((o) => ({
            ...o.aluno,
            orientacaoId: o._id,
            proposta: o.proposta,
            notificacao: o.notificacao,
            cancelamento: o.cancelamento,
            dataCriacao: o.dataCriacao,
            faseAtual: o.faseAtual,
        }));
});

function estaAtrasado(faseAtual) {
    if (!faseAtual?.prazo) return false;
    return new Date(faseAtual.prazo) < new Date();
}

const alunosAtrasados = computed(() => alunosOrientadosBase.value.filter((a) => estaAtrasado(a.faseAtual)));
const alunosNoPrazo = computed(() => alunosOrientadosBase.value.length - alunosAtrasados.value.length);

const alunosOrientados = computed(() => {
    if (filtroStatus.value === 'atrasado') return alunosAtrasados.value;
    if (filtroStatus.value === 'em-dia') return alunosOrientadosBase.value.filter((a) => !estaAtrasado(a.faseAtual));
    return alunosOrientadosBase.value;
});

const orientacoesComDefesa = computed(() =>
    orientacoes
        .filter((o) => o.situacao === 'confirmado' && o.dataDefesa)
        .sort((a, b) => new Date(a.dataDefesa) - new Date(b.dataDefesa))
);

const proximaDefesa = computed(() => orientacoesComDefesa.value[0] || null);

const NOMES_FASES = ['Proposta', 'Desenvolvimento', 'Pré-defesa', 'Versão final', 'Aguardando defesa'];
const distribuicaoFases = computed(() => {
    const contagem = Object.fromEntries(NOMES_FASES.map((nome) => [nome, 0]));
    alunosOrientadosBase.value.forEach((a) => {
        const nome = a.faseAtual?.nome || 'Aguardando defesa';
        if (contagem[nome] !== undefined) contagem[nome]++;
    });
    return NOMES_FASES.map((nome) => ({ nome, total: contagem[nome] }));
});
const maiorFase = computed(() => Math.max(1, ...distribuicaoFases.value.map((f) => f.total)));

const minhaOrientacao = computed(() => orientacoes.find((o) => o.situacao === 'confirmado') || null);
const minhasEmAndamento = computed(() => orientacoes.filter((o) => o.situacao === 'confirmado').length);
const minhaFaseAtual = computed(() => minhaOrientacao.value?.faseAtual || null);
const minhaOrientacaoAtrasada = computed(() => estaAtrasado(minhaOrientacao.value?.faseAtual));

const diasParaDefesa = computed(() => {
    if (!minhaOrientacao.value?.dataDefesa) return null;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const alvo = new Date(minhaOrientacao.value.dataDefesa);
    return Math.round((alvo - hoje) / (1000 * 60 * 60 * 24));
});

const concluidas = computed(() => historico.filter((h) => h.situacao === 'concluido').length);
const totalSolicitacoes = computed(() => orientacoes.length + historico.length);

async function listarHistorico() {
    await api.get('/orientacao/historico')
        .then((res) => {
            Object.assign(historico, res.data?.item);
        }).catch(() => {});
}

async function start() {
    if (props?.usuario?.tipo === 'professor') {
        await listarOrientacao();
        await listarHistorico();
        return;
    }
    await api.get('/usuario/professores')
        .then((res) => {
            professores.value = res.data.item;
        }).catch(() => {
            popupInfo().warning('Erro ao pesquisar usuários.');
        })
    if (props?.usuario.tipo === 'aluno') {
        await listarOrientacao()
        await listarHistorico()
    }
}

function iniciarSolicitacao(professor) {
    professorSelecionado._id = professor._id;
    professorSelecionado.email = professor.email;
    openSolicitarOrientacao.value = true;
}

async function recarregarAposSolicitar(event) {
    openSolicitarOrientacao.value = event;
    await listarOrientacao();
    await listaOrientacaoRef.value?.listarOrientacao();
}

function orientacaoDoProfessor(professorId) {
    return orientacoes.find((item) => item?.professor?._id === professorId) || null;
}

async function listarOrientacao(){
    await api.get(`/orientacao/`)
    .then((res)=>{
        Object.assign(orientacoes, res.data?.item)
    }).catch((e)=>{
        popupInfo().warning(e?.response?.data?.msg || e);
    })
}

onMounted(async()=>{
    isLoading.changeStateTrue();
    await start();
    isLoading.changeStateFalse();
    window.addEventListener('sotcc:notificacao-vista', listarOrientacao);
});

onUnmounted(() => {
    window.removeEventListener('sotcc:notificacao-vista', listarOrientacao);
});
</script>

<style scoped>
.home-shell {
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
    align-items: start;
    gap: 20px;
}
.home-rail {
    position: sticky;
    top: 14px;
}
@media (max-width: 860px) {
    .home-shell {
        grid-template-columns: 1fr;
    }
    .home-rail {
        position: static;
    }
}
</style>
